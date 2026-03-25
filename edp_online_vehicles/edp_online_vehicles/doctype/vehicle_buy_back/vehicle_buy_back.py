# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import cint, now_datetime, today


class VehicleBuyBack(Document):
	def validate(self):
		if not self.buy_back_date_time:
			self.buy_back_date_time = now_datetime()
		if not self.status:
			self.status = "Awaiting Customer Feedback"

		self._apply_buy_from_company_rules()
		self._validate_unique_vins()
		self._validate_vehicle_statuses_by_buy_from()
		self._validate_dealer_vins_when_buy_from_dealer()
		self.vat = 15
		self._populate_child_from_vehicle_and_model()
		self.calculate_totals()
		self.calculate_offer_price()

	def _validate_unique_vins(self):
		seen = set()
		duplicates = set()
		for row in self.table_vsmr or []:
			vin = (row.get("vin_serial_no") or "").strip()
			if not vin:
				continue
			if vin in seen:
				duplicates.add(vin)
			else:
				seen.add(vin)

		if duplicates:
			duplicate_list = ", ".join(sorted(duplicates))
			frappe.throw(f"Duplicate VIN(s) in Buy Back list: {duplicate_list}")

	def _validate_vehicle_statuses_by_buy_from(self):
		buy_from = (self.buy_from or "").strip()
		if buy_from == "Dealer":
			allowed_statuses = {"available", "reserved"}
			allowed_statuses_label = "Available/Reserved"
		else:
			allowed_statuses = {"sold"}
			allowed_statuses_label = "Sold"

		for row in self.table_vsmr or []:
			vin = (row.get("vin_serial_no") or "").strip()
			if not vin:
				continue

			status = frappe.db.get_value("Vehicle Stock", vin, "availability_status")
			if status is None:
				frappe.throw(f"VIN {vin} was not found in Vehicle Stock.")

			if str(status).strip().lower() not in allowed_statuses:
				frappe.throw(
					f"VIN {vin} cannot be added because its status is '{status}'. "
					f"Only {allowed_statuses_label} vehicles are allowed."
				)

	def _validate_dealer_vins_when_buy_from_dealer(self):
		if (self.buy_from or "").strip() != "Dealer":
			return

		selected_dealer = (self.dealer or "").strip()
		if not selected_dealer:
			frappe.throw("Buy From Dealer must be selected when Buy From is Dealer.")

		for row in self.table_vsmr or []:
			vin = (row.get("vin_serial_no") or "").strip()
			if not vin:
				continue

			vin_dealer = (frappe.db.get_value("Vehicle Stock", vin, "dealer") or "").strip()
			if not vin_dealer:
				frappe.throw(f"VIN {vin} has no dealer assigned in Vehicle Stock.")

			if vin_dealer != selected_dealer:
				frappe.throw(
					f"VIN {vin} belongs to dealer '{vin_dealer}', but this Buy Back dealer is '{selected_dealer}'."
				)

	def _apply_buy_from_company_rules(self):
		user_company = frappe.defaults.get_user_default("Company")
		if not user_company:
			return

		if not self.purchasing_dealer:
			self.purchasing_dealer = user_company

		company_for_rules = self.purchasing_dealer or user_company
		is_head_office = frappe.db.get_value("Company", company_for_rules, "custom_head_office")
		if not cint(is_head_office) and self.is_new():
			self.buy_from = "Customer"
	
	def _populate_child_from_vehicle_and_model(self):
		if not self.table_vsmr:
			return
		for row in self.table_vsmr:
			if not row.get("vin_serial_no"):
				continue
			vin = row.vin_serial_no
			vehicle = frappe.db.get_value(
				"Vehicle Stock", vin,
				["model", "description", "engine_no", "colour", "condition", "availability_status",
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
				if vehicle.get("availability_status") is not None and row.get("availability_status") is None:
					row.availability_status = vehicle.availability_status
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


@frappe.whitelist()
def get_vin_details(vin):
	vin = (vin or "").strip()
	if not vin:
		return {}

	vehicle = frappe.db.get_value(
		"Vehicle Stock",
		vin,
		[
			"model",
			"description",
			"engine_no",
			"colour",
			"condition",
			"availability_status",
			"ho_invoice_no",
			"ho_invoice_amt",
			"ho_invoice_date",
			"customer",
			"dealer",
		],
		as_dict=True,
	)
	if not vehicle:
		return {}

	model_data = {}
	if vehicle.get("model"):
		model_data = frappe.db.get_value(
			"Model Administration",
			vehicle.model,
			["cost_price_excl", "dealer_billing_excl", "suggested_retail_excl"],
			as_dict=True,
		) or {}

	vehicle.update(model_data)
	return vehicle


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def buy_back_vin_query(doctype, txt, searchfield, start, page_len, filters):
	filters = frappe._dict(filters or {})
	conditions = [
		"availability_status = %(availability_status)s",
		f"({searchfield} LIKE %(txt)s OR name LIKE %(txt)s)",
	]
	params = {
		"txt": f"%{txt}%",
		"availability_status": filters.get("availability_status") or "Sold",
		"start": start,
		"page_len": page_len,
	}

	if filters.get("dealer"):
		conditions.append("dealer = %(dealer)s")
		params["dealer"] = filters.get("dealer")

	return frappe.db.sql(
		f"""
			SELECT name, model, description
			FROM `tabVehicle Stock`
			WHERE {' AND '.join(conditions)}
			ORDER BY name ASC
			LIMIT %(page_len)s OFFSET %(start)s
		""",
		params,
	)


@frappe.whitelist()
def submit_with_seller_decision(docname, decision):
	try:
		doc = frappe.get_doc("Vehicle Buy Back", docname)
		if doc.docstatus != 0:
			return {"success": False, "error": "Only draft Vehicle Buy Back documents can be submitted."}

		normalized = (decision or "").strip().lower()
		decision_map = {
			"accepted": "Seller Accepted",
			"declined": "Seller Declined",
		}
		target_status = decision_map.get(normalized)
		if not target_status:
			return {"success": False, "error": "Invalid seller decision."}

		doc.status = target_status
		doc.submit()

		transfer_result = None
		if normalized == "accepted":
			transfer_result = transfer_vehicles_to_dealer(docname, doc.purchasing_dealer)

		return {"success": True, "status": target_status, "transfer": transfer_result}
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Vehicle Buy Back Seller Decision Error")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def search_vins(vins, buy_from):
	"""Look up the customer for each VIN in Vehicle Stock.
	Returns:
	  {"status": "single",   "customer": "<name>"}   all VINs share one customer
	  {"status": "multiple", "customers": [...]}     VINs have different customers
	  {"status": "none"}                             no customer found on any VIN
	"""
	import json
	if isinstance(vins, str):
		vins = json.loads(vins)



	# Get customer(s) for the VINs when buy_from is Customer
	if buy_from == "Customer":
		customers = []
		for vin in vins:
			customer = frappe.db.get_value("Vehicle Stock", vin, "customer")
			if customer:
				customers.append(customer)

		unique = list(dict.fromkeys(customers))  # deduplicate, preserve order
		if len(unique) == 1:
			return {"status": "single", "customer": unique[0]}
		elif len(unique) == 0:
			return {"status": "none"}
		else:
			return {"status": "multiple", "customers": unique}	
	
	# Get dealer(s) for the VINs when buy_from is Dealer
	if buy_from == "Dealer":
		dealers = []
		for vin in vins:
			dealer = frappe.db.get_value("Vehicle Stock", vin, "dealer")
			if dealer:
				dealers.append(dealer)

		unique = list(dict.fromkeys(dealers))  # deduplicate, preserve order
		if len(unique) == 1:
			return {"status": "single", "dealer": unique[0]}
		elif len(unique) == 0:
			return {"status": "none"}
		else:
			return {"status": "multiple", "dealers": unique}


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

		target_warehouse_company = frappe.db.get_value("Warehouse", target_warehouse, "company")
		if not target_warehouse_company:
			return {
				"success": False,
				"error": f"Could not determine company for warehouse '{target_warehouse}'."
			}
		
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
				current_warehouse = serial_doc.warehouse or vehicle.target_warehouse
				if current_warehouse and serial_doc.warehouse != current_warehouse:
					serial_doc.db_set("warehouse", current_warehouse, update_modified=False)
					serial_doc.warehouse = current_warehouse

				row_cost = row.get("cost_price_excl")
				if not row_cost and vehicle.model:
					row_cost = frappe.db.get_value("Model Administration", vehicle.model, "cost_price_excl")
				basic_rate = float(row_cost or 0)

				if current_warehouse:
					# Vehicle is in another dealer's warehouse (dealer buy-back): issue it out first
					source_company = frappe.db.get_value("Warehouse", current_warehouse, "company")
					if not source_company:
						raise Exception(f"Cannot determine source company for warehouse {current_warehouse}")

					issue_entry = frappe.new_doc("Stock Entry")
					issue_entry.stock_entry_type = "Material Issue"
					issue_entry.company = source_company
					issue_entry.append("items", {
						"s_warehouse": current_warehouse,
						"item_code": vehicle.model,
						"qty": 1,
						"uom": "Unit",
						"basic_rate": basic_rate,
						"use_serial_batch_fields": 1,
						"serial_no": vin,
						"allow_zero_valuation_rate": 1,
					})
					issue_entry.insert(ignore_permissions=True)
					issue_entry.submit()

				# Receive the vehicle into the purchasing dealer's warehouse
				# (mirrors reverse_retail pattern for customer buy-backs where Serial No has no warehouse)
				receipt_entry = frappe.new_doc("Stock Entry")
				receipt_entry.stock_entry_type = "Material Receipt"
				receipt_entry.company = target_warehouse_company
				receipt_entry.append("items", {
					"t_warehouse": target_warehouse,
					"item_code": vehicle.model,
					"qty": 1,
					"uom": "Unit",
					"basic_rate": basic_rate,
					"use_serial_batch_fields": 1,
					"serial_no": vin,
					"allow_zero_valuation_rate": 1,
				})
				receipt_entry.insert(ignore_permissions=True)
				receipt_entry.submit()
				
				previous_dealer = vehicle.dealer or "Unknown"
				# Clear previous ownership card details on Vehicle Stock.
				vehicle.customer = ""
				vehicle.customer_full_name = ""
				vehicle.email = ""
				vehicle.phone = ""
				vehicle.mobile = ""
				vehicle.address = ""
				vehicle.fleet_customer = ""
				vehicle.company_reg_no = ""
				vehicle.fleet_customer_name = ""
				vehicle.fleet_customer_email = ""
				vehicle.fleet_code = ""
				vehicle.fleet_customer_phone = ""
				vehicle.fleet_customer_mobile = ""
				vehicle.fleet_customer_address = ""
				vehicle.dealer = purchasing_dealer
				vehicle.target_warehouse = target_warehouse
				vehicle.availability_status = "Available"

				if not vehicle.delivery_date:
					vehicle.delivery_date = today()

				comment = f"Vehicle received via Buy Back {docname} from {previous_dealer} to {purchasing_dealer}"
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