# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, today
from datetime import datetime


class VehicleBuyBack(Document):
	def validate(self):
		if not self.buy_back_date_time:
			self.buy_back_date_time = now_datetime()
		
		self.vat = 15
		self._populate_child_from_vehicle_and_model()
		self.calculate_totals()
		self.calculate_offer_price()
	
	def _populate_child_from_vehicle_and_model(self):
		if not self.table_vsmr:
			return
		for row in self.table_vsmr:
			if not row.get("vin_serial_no"):
				continue
			vin = row.vin_serial_no
			vehicle = frappe.db.get_value(
				"Vehicle Stock", vin,
				["model", "description", "engine_no", "colour", "condition", "status",
				 "ho_invoice_no", "ho_invoice_amt", "ho_invoice_date"],
				as_dict=True
			)
			if vehicle:
				if vehicle.get("model") and not row.get("model"):
					row.model = vehicle.model
				for f in ("description", "engine_no", "ho_invoice_no", "ho_invoice_amt", "ho_invoice_date"):
					if vehicle.get(f) is not None and row.get(f) is None:
						setattr(row, f, vehicle[f])
				if vehicle.get("colour") is not None and row.get("exterior_colour") is None:
					row.exterior_colour = vehicle.colour
				if vehicle.get("condition") is not None and row.get("condition") is None:
					row.condition = vehicle.condition
				if vehicle.get("status") is not None and row.get("operational_status") is None:
					row.operational_status = vehicle.status
			model = row.get("model") or (vehicle.get("model") if vehicle else None)
			if model:
				model_data = frappe.db.get_value(
					"Model Administration", model,
					["cost_price_excl", "dealer_billing_excl", "suggested_retail_excl"],
					as_dict=True
				)
				if model_data:
					for f in ("cost_price_excl", "dealer_billing_excl", "suggested_retail_excl"):
						if model_data.get(f) is not None:
							setattr(row, f, model_data[f])
	
	def calculate_totals(self):
		total_cost_price = 0
		total_dealer_billing = 0
		total_suggested_retail = 0
		if self.table_vsmr:
			for row in self.table_vsmr:
				total_cost_price += float(row.get("cost_price_excl") or 0)
				total_dealer_billing += float(row.get("dealer_billing_excl") or 0)
				total_suggested_retail += float(row.get("suggested_retail_excl") or 0)
		self.cost_price_excl = total_cost_price
		self.dealer_billing_excl = total_dealer_billing
		self.suggested_retail_excl = total_suggested_retail
	
	def calculate_offer_price(self):
		offer_excl = float(self.offer_price_excl or 0)
		vat_percent = float(self.vat or 15)
		vat_amount = (offer_excl * vat_percent) / 100
		self.offer_price_incl = offer_excl + vat_amount
	
	def on_update(self):
		doc_before_save = self.get_doc_before_save()
		if doc_before_save:
			old_status = doc_before_save.status
			new_status = self.status
			
			if old_status != new_status and new_status == "Completed":
				pass


@frappe.whitelist()
def transfer_vehicles_to_dealer(docname, purchasing_dealer):
	try:
		doc = frappe.get_doc("Vehicle Buy Back", docname)
		
		if not doc.purchasing_dealer:
			return {"success": False, "error": "Purchasing dealer not specified"}
		
		if not doc.table_vsmr or len(doc.table_vsmr) == 0:
			return {"success": False, "error": "No vehicles in the buy back list"}
		
		if not frappe.db.exists("Company", purchasing_dealer):
			return {"success": False, "error": f"Purchasing dealer company '{purchasing_dealer}' does not exist"}
		
		purchasing_company = frappe.get_doc("Company", purchasing_dealer)
		target_warehouse = purchasing_company.custom_default_vehicles_stock_warehouse
		
		if not target_warehouse:
			target_warehouse = "Stores - " + purchasing_company.abbr
			if frappe.db.exists("Warehouse", target_warehouse):
				purchasing_company.custom_default_vehicles_stock_warehouse = target_warehouse
				purchasing_company.save(ignore_permissions=True)
			else:
				warehouses = frappe.db.get_all("Warehouse", 
					filters={"company": purchasing_dealer, "disabled": 0},
					fields=["name"],
					limit=1
				)
				if warehouses:
					target_warehouse = warehouses[0].name
					purchasing_company.custom_default_vehicles_stock_warehouse = target_warehouse
					purchasing_company.save(ignore_permissions=True)
				else:
					return {"success": False, "error": f"No warehouse found for purchasing dealer '{purchasing_dealer}'. Please create a warehouse first."}
		
		if not frappe.db.exists("Warehouse", target_warehouse):
			return {"success": False, "error": f"Warehouse '{target_warehouse}' does not exist for purchasing dealer. Please create it first."}
		
		transferred_vehicles = []
		failed_vehicles = []
		
		for row in doc.table_vsmr:
			if not row.vin_serial_no:
				continue
				
			try:
				vin = row.vin_serial_no
				vehicle = frappe.get_doc("Vehicle Stock", vin)
				
				if not frappe.db.exists("Serial No", vin):
					raise Exception(f"Serial No {vin} does not exist")
				
				serial_doc = frappe.get_doc("Serial No", vin)
				current_warehouse = serial_doc.warehouse
				
				if not current_warehouse:
					raise Exception(f"Serial No {vin} does not have a warehouse assigned")
				
				current_dealer = vehicle.dealer
				if not current_dealer:
					warehouse_doc = frappe.get_doc("Warehouse", current_warehouse)
					current_dealer = warehouse_doc.company
				
				if not current_dealer:
					raise Exception(f"Cannot determine current dealer for vehicle {vin}")
				
				issue_entry = frappe.new_doc("Stock Entry")
				issue_entry.stock_entry_type = "Material Issue"
				issue_entry.company = current_dealer
				issue_entry.append("items", {
					"s_warehouse": current_warehouse,
					"item_code": vehicle.model,
					"qty": 1,
					"uom": "Unit",
					"basic_rate": float(row.get("cost_price_excl") or vehicle.cost_price_excl or 0),
					"use_serial_batch_fields": 1,
					"serial_no": vin,
					"allow_zero_valuation_rate": 1,
				})
				issue_entry.insert(ignore_permissions=True)
				frappe.flags.ignore_permissions = True
				issue_entry.submit()
				frappe.flags.ignore_permissions = False
				
				receipt_entry = frappe.new_doc("Stock Entry")
				receipt_entry.stock_entry_type = "Material Receipt"
				receipt_entry.company = purchasing_dealer
				receipt_entry.append("items", {
					"t_warehouse": target_warehouse,
					"item_code": vehicle.model,
					"qty": 1,
					"uom": "Unit",
					"basic_rate": float(row.get("cost_price_excl") or vehicle.cost_price_excl or 0),
					"use_serial_batch_fields": 1,
					"serial_no": vin,
					"allow_zero_valuation_rate": 1,
				})
				receipt_entry.insert(ignore_permissions=True)
				frappe.flags.ignore_permissions = True
				receipt_entry.submit()
				frappe.flags.ignore_permissions = False
				
				vehicle.dealer = purchasing_dealer
				vehicle.target_warehouse = target_warehouse
				vehicle.availability_status = "Available"
				
				if not vehicle.delivery_date:
					vehicle.delivery_date = today()
				
				comment = f"Vehicle transferred via Buy Back {docname} from {current_dealer or 'Unknown'} to {purchasing_dealer}"
				vehicle.add_comment("Comment", comment)
				vehicle.save(ignore_permissions=True)
				
				transferred_vehicles.append(vin)
				
			except Exception as e:
				frappe.log_error(f"Error transferring vehicle {row.vin_serial_no}: {str(e)}", "Vehicle Buy Back Transfer Error")
				failed_vehicles.append({"vin": row.vin_serial_no, "error": str(e)})
		
		frappe.db.commit()
		
		message = f"Successfully transferred {len(transferred_vehicles)} vehicle(s) to {purchasing_dealer}"
		if failed_vehicles:
			message += f". Failed to transfer {len(failed_vehicles)} vehicle(s)."
		
		return {
			"success": True,
			"message": message,
			"transferred": transferred_vehicles,
			"failed": failed_vehicles
		}
		
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Vehicle Buy Back Transfer Error")
		return {"success": False, "error": str(e)}