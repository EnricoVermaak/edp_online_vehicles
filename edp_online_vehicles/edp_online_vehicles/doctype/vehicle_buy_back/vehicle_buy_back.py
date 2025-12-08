# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
from datetime import datetime


class VehicleBuyBack(Document):
	def validate(self):
		# Check if status changed to Completed and trigger appropriate action
		if self.status == "Completed":
			# Check if this is a status change to Completed (only process once)
			prev_status = None
			if not self.is_new():
				prev_doc = self.get_doc_before_save()
				if prev_doc:
					prev_status = prev_doc.status
			
			if self.is_new() or (prev_status and prev_status != "Completed"):
				# Check if VIN is not found (manual entry)
				if self.vin_not_found and self.vin_serial_no_manual:
					# Check if vehicle stock already created (prevent duplicate)
					if not self.get("_vehicle_stock_created"):
						self.create_vehicle_stock_for_unconfirmed_vin()
						self._vehicle_stock_created = True
				# If VIN is found and buying from dealer, transfer to head office
				elif self.vin_serial_no and not self.vin_not_found and self.buy_from == "Dealer" and self.dealer:
					# Check if transfer already happened (prevent duplicate)
					if not self.get("_transfer_completed"):
						self.transfer_vehicle_to_head_office()
						self._transfer_completed = True
				# If VIN is found and buying from customer, transfer to user's company
				elif self.vin_serial_no and not self.vin_not_found and self.buy_from == "Customer":
					# Check if transfer already happened (prevent duplicate)
					if not self.get("_transfer_completed"):
						self.transfer_vehicle_from_customer()
						self._transfer_completed = True
	
	def transfer_vehicle_from_customer(self):
		"""
		Transfer vehicle from customer to company (dealer or head office) when buy back is completed.
		Creates Material Receipt to add vehicle to company warehouse.
		"""
		try:
			# Get Vehicle Stock document
			if not frappe.db.exists("Vehicle Stock", self.vin_serial_no):
				frappe.throw(f"Vehicle Stock {self.vin_serial_no} does not exist.")
			
			stock_doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no, ignore_permissions=True)
			
			# Validate required fields
			if not stock_doc.model:
				frappe.throw(f"Model is missing for Vehicle Stock {self.vin_serial_no}.")
			
			# Get target company (user's company - could be dealer or head office)
			target_company = frappe.defaults.get_user_default("Company")
			
			if not target_company:
				# Try to get from global defaults as fallback
				target_company = frappe.db.get_single_value("Global Defaults", "default_company")
			
			if not target_company:
				frappe.throw("Company not found. Please set default company.")
			
			target_company_doc = frappe.get_doc("Company", target_company, ignore_permissions=True)
			
			# Get target company default warehouse
			if not target_company_doc.custom_default_vehicles_stock_warehouse:
				# Default to "Stores - {abbr}" if not set
				target_warehouse = f"Stores - {target_company_doc.abbr}"
			else:
				target_warehouse = target_company_doc.custom_default_vehicles_stock_warehouse
			
			# Validate warehouse exists
			if not frappe.db.exists("Warehouse", target_warehouse):
				frappe.throw(f"Destination warehouse '{target_warehouse}' does not exist.")
			
			# Get model document for pricing
			model_doc = frappe.get_doc("Model Administration", stock_doc.model, ignore_permissions=True)
			basic_rate = model_doc.dealer_billing_excl or self.cost_price_excl or 0
			
			# Create Material Receipt Stock Entry (to company)
			new_receipt = frappe.new_doc("Stock Entry")
			new_receipt.stock_entry_type = "Material Receipt"
			new_receipt.company = target_company
			new_receipt.append("items", {
				"t_warehouse": target_warehouse,
				"item_code": stock_doc.model,
				"qty": 1,
				"uom": "Unit",
				"stock_uom": "Unit",
				"basic_rate": basic_rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
				"allow_zero_valuation_rate": 1
			})
			new_receipt.insert(ignore_permissions=True)
			new_receipt.submit()
			
			# Update Vehicle Stock document
			stock_doc.dealer = target_company
			stock_doc.target_warehouse = target_warehouse
			stock_doc.availability_status = "Available"
			
			# Clear customer if it was set and unlink from Dealer Customer
			if self.customer:
				# Unlink VIN from Dealer Customer's vehicles_linked_to_customer table
				if frappe.db.exists("Dealer Customer", self.customer):
					customer_doc = frappe.get_doc("Dealer Customer", self.customer, ignore_permissions=True)
					
					# Check if VIN is in the linked vehicles table and remove it
					original_count = len(customer_doc.vehicles_linked_to_customer)
					customer_doc.vehicles_linked_to_customer = [
						row for row in customer_doc.vehicles_linked_to_customer 
						if row.vin_serial_no != self.vin_serial_no
					]
					
					# Only save if a row was removed
					if len(customer_doc.vehicles_linked_to_customer) < original_count:
						customer_doc.save(ignore_permissions=True)
				
				# Clear customer field in Vehicle Stock
				if stock_doc.customer:
					stock_doc.customer = ""
			
			stock_doc.save(ignore_permissions=True)
			
			# Create Vehicle Tracking document
			now = datetime.now()
			user = frappe.get_value("User", frappe.session.user, "full_name") or frappe.session.user
			
			customer_name = self.customer_full_names or self.customer or "Customer"
			
			new_tracking_doc = frappe.new_doc("Vehicle Tracking")
			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")
			
			new_tracking_doc.vin_serial_no = stock_doc.name
			new_tracking_doc.action_summary = "Vehicle Bought Back from Customer"
			new_tracking_doc.request_datetime = tracking_date_time
			new_tracking_doc.request = (
				f"VIN/Serial No {stock_doc.name} has been bought back from customer {customer_name} "
				f"and transferred to warehouse {target_warehouse} by user {user}"
			)
			new_tracking_doc.status = "Processed"
			new_tracking_doc.type = "EDP Online"
			
			new_tracking_doc.insert(ignore_permissions=True)
			
			frappe.db.commit()
			
			frappe.msgprint(
				f"Vehicle {stock_doc.name} has been successfully transferred to warehouse {target_warehouse}."
			)
			
		except Exception as e:
			frappe.log_error(f"Error transferring vehicle in buy back {self.name}: {str(e)}", "Vehicle Buy Back Transfer Error")
			frappe.throw(f"Error transferring vehicle: {str(e)}")
	
	def create_vehicle_stock_for_unconfirmed_vin(self):
		"""
		Create Vehicle Stock document and related documents when VIN is not found in system.
		This happens when buying back from a customer and the vehicle is not in the system.
		"""
		try:
			# Validate required fields
			if not self.vin_serial_no_manual:
				frappe.throw("VIN/Serial No (Manual Entry) is required when VIN Not Found is checked.")
			
			if not self.model:
				frappe.throw("Model is required to create Vehicle Stock.")
			
			# Check if Vehicle Stock already exists with this VIN
			if frappe.db.exists("Vehicle Stock", self.vin_serial_no_manual):
				frappe.throw(f"Vehicle Stock with VIN {self.vin_serial_no_manual} already exists.")
			
			# Determine the company based on buy_from
			if self.buy_from == "Dealer":
				# Buying from dealer - vehicle goes to head office
				target_company = frappe.defaults.get_user_default("Company")
				if not target_company:
					target_company = frappe.db.get_single_value("Global Defaults", "default_company")
				if not target_company:
					frappe.throw("Head Office company not found. Please set default company.")
			elif self.buy_from == "Customer":
				# Buying from customer - vehicle goes to the company of the user creating the buy back
				# This could be dealer or head office depending on who creates it
				target_company = frappe.defaults.get_user_default("Company")
				if not target_company:
					target_company = frappe.db.get_single_value("Global Defaults", "default_company")
				if not target_company:
					frappe.throw("Company not found. Please set default company.")
			else:
				frappe.throw("Invalid buy_from value.")
			
			# Get company document
			company_doc = frappe.get_doc("Company", target_company, ignore_permissions=True)
			
			# Get default warehouse
			if not company_doc.custom_default_vehicles_stock_warehouse:
				# Default to "Stores - {abbr}" if not set
				target_warehouse = f"Stores - {company_doc.abbr}"
				# Update company document with default warehouse
				company_doc.custom_default_vehicles_stock_warehouse = target_warehouse
				company_doc.save(ignore_permissions=True)
			else:
				target_warehouse = company_doc.custom_default_vehicles_stock_warehouse
			
			# Validate warehouse exists
			if not frappe.db.exists("Warehouse", target_warehouse):
				frappe.throw(f"Warehouse '{target_warehouse}' does not exist.")
			
			# Validate model exists
			if not frappe.db.exists("Model Administration", self.model):
				frappe.throw(f"Model Administration '{self.model}' does not exist.")
			
			model_doc = frappe.get_doc("Model Administration", self.model, ignore_permissions=True)
			
			# Create Serial No document
			if not frappe.db.exists("Serial No", self.vin_serial_no_manual):
				serial_no = frappe.new_doc("Serial No")
				serial_no.serial_no = self.vin_serial_no_manual
				serial_no.item_code = self.model
				serial_no.company = target_company
				serial_no.insert(ignore_permissions=True)
			
			# Create Vehicle Stock document
			new_stock = frappe.new_doc("Vehicle Stock")
			new_stock.vin_serial_no = self.vin_serial_no_manual
			new_stock.model = self.model
			new_stock.dealer = target_company
			new_stock.target_warehouse = target_warehouse
			new_stock.availability_status = "Available"
			new_stock.type = "Used"  # Buy back vehicles are used
			
			# Set vehicle details from form
			if self.colour:
				new_stock.colour = self.colour
			if self.description:
				new_stock.description = self.description
			if self.engine_no:
				new_stock.engine_no = self.engine_no
			if self.condition:
				new_stock.condition = self.condition
			if self.operational_status:
				new_stock.status = self.operational_status
			
			# Set pricing from form or model
			if self.cost_price_excl:
				new_stock.cost_price_excl = self.cost_price_excl
			elif model_doc.cost_price_excl:
				new_stock.cost_price_excl = model_doc.cost_price_excl
			
			if self.dealer_billing_excl:
				new_stock.dealer_billing_excl = self.dealer_billing_excl
			elif model_doc.dealer_billing_excl:
				new_stock.dealer_billing_excl = model_doc.dealer_billing_excl
			
			if self.suggested_retail_excl:
				new_stock.suggested_retail_excl = self.suggested_retail_excl
			elif model_doc.suggested_retail_excl:
				new_stock.suggested_retail_excl = model_doc.suggested_retail_excl
			
			# Set HO invoice details if provided
			if self.ho_invoice_no:
				new_stock.ho_invoice_no = self.ho_invoice_no
			if self.ho_invoice_amt:
				new_stock.ho_invoice_amt = self.ho_invoice_amt
			if self.ho_invoice_date_time:
				# Convert datetime to date if needed
				if isinstance(self.ho_invoice_date_time, str):
					from frappe.utils import getdate
					new_stock.ho_invoice_date = getdate(self.ho_invoice_date_time)
				elif hasattr(self.ho_invoice_date_time, 'date'):
					new_stock.ho_invoice_date = self.ho_invoice_date_time.date()
				else:
					new_stock.ho_invoice_date = self.ho_invoice_date_time
			
			# Set category from model if available
			if model_doc.category:
				new_stock.catagory = model_doc.category
			
			# Set a flag to prevent Vehicle Stock's after_insert from creating stock entry
			# We'll create it manually with proper permissions
			new_stock.shipment_id = "BUY_BACK_" + self.name
			new_stock.insert(ignore_permissions=True)
			
			# Create Stock Entry (Material Receipt) to add vehicle to warehouse
			basic_rate = self.cost_price_excl or model_doc.dealer_billing_excl or 0
			
			stock_entry = frappe.new_doc("Stock Entry")
			stock_entry.stock_entry_type = "Material Receipt"
			stock_entry.company = target_company
			stock_entry.append("items", {
				"t_warehouse": target_warehouse,
				"item_code": self.model,
				"qty": 1,
				"uom": "Unit",
				"stock_uom": "Unit",
				"basic_rate": basic_rate,
				"use_serial_batch_fields": 1,
				"serial_no": self.vin_serial_no_manual,
				"allow_zero_valuation_rate": 1
			})
			stock_entry.insert(ignore_permissions=True)
			stock_entry.submit()
			
			# Clear the shipment_id flag after stock entry is created
			new_stock.shipment_id = ""
			new_stock.save(ignore_permissions=True)
			
			# Create Vehicle Tracking document
			now = datetime.now()
			user = frappe.get_value("User", frappe.session.user, "full_name") or frappe.session.user
			
			new_tracking_doc = frappe.new_doc("Vehicle Tracking")
			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")
			
			new_tracking_doc.vin_serial_no = self.vin_serial_no_manual
			new_tracking_doc.action_summary = "Vehicle Bought Back - New Stock Created"
			new_tracking_doc.request_datetime = tracking_date_time
			
			buy_from_text = f"from {self.buy_from.lower()}"
			if self.buy_from == "Dealer" and self.dealer:
				buy_from_text = f"from dealer {self.dealer}"
			elif self.buy_from == "Customer" and self.customer:
				customer_name = self.customer_full_names or self.customer or "Customer"
				buy_from_text = f"from customer {customer_name}"
			
			new_tracking_doc.request = (
				f"VIN/Serial No {self.vin_serial_no_manual} was bought back {buy_from_text} "
				f"and created as new Vehicle Stock in warehouse {target_warehouse} by user {user}"
			)
			new_tracking_doc.status = "Processed"
			new_tracking_doc.type = "EDP Online"
			
			new_tracking_doc.insert(ignore_permissions=True)
			
			frappe.db.commit()
			
			frappe.msgprint(
				f"Vehicle Stock {self.vin_serial_no_manual} has been successfully created and added to warehouse {target_warehouse}."
			)
			
		except Exception as e:
			frappe.log_error(f"Error creating vehicle stock in buy back {self.name}: {str(e)}", "Vehicle Buy Back Create Stock Error")
			frappe.throw(f"Error creating vehicle stock: {str(e)}")
