from datetime import datetime

import frappe


def _resolve_vehicle_source_warehouse(vinno, stock_doc=None, serial_doc=None):
	warehouse = None

	if serial_doc and serial_doc.warehouse:
		warehouse = serial_doc.warehouse
	elif stock_doc and stock_doc.target_warehouse:
		warehouse = stock_doc.target_warehouse
	else:
		warehouse = frappe.db.get_value("Vehicle Stock", vinno, "target_warehouse")

	if warehouse and serial_doc and serial_doc.warehouse != warehouse:
		serial_doc.db_set("warehouse", warehouse, update_modified=False)
		serial_doc.warehouse = warehouse

	return warehouse


@frappe.whitelist()
def auto_move_stock_hq(vinno, hq, dealer, model, rate):
	try:
		stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
		com_doc = frappe.get_doc("Company", dealer, ignore_permissions=True)
		serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
		current_warehouse = _resolve_vehicle_source_warehouse(vinno, stock_doc=stock_doc, serial_doc=serial_doc)

		if not current_warehouse:
			frappe.throw(f"Could not determine source warehouse for VIN {vinno}.")

		if not com_doc.custom_default_vehicles_stock_warehouse:
			com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
			com_doc.save(ignore_permissions=True)

		new_issue = frappe.new_doc("Stock Entry")

		new_issue.stock_entry_type = "Material Issue"
		new_issue.company = hq

		new_issue.append(
			"items",
			{
				"s_warehouse": current_warehouse,
				"item_code": model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
				"allow_zero_valuation_rate": 1,
			},
		)

		new_issue.insert(ignore_permissions=True)
		new_issue.submit()

		new_receipt = frappe.new_doc("Stock Entry")

		new_receipt.stock_entry_type = "Material Receipt"
		new_receipt.company = dealer

		new_receipt.append(
			"items",
			{
				"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
				"item_code": model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
				"allow_zero_valuation_rate": 1,
			},
		)

		new_receipt.insert(ignore_permissions=True)
		new_receipt.submit()

		stock_doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
		stock_doc.dealer = dealer
		stock_doc.availability_status = "Available"
		stock_doc.hq_order_no = None

		if not stock_doc.delivery_date:
			stock_doc.delivery_date = frappe.utils.today()

		if not stock_doc.original_purchasing_dealer:
			stock_doc.original_purchasing_dealer = dealer

		comment = f"Vehicle has been transferred from Head Office to Dealer: {dealer}"

		stock_doc.add_comment("Comment", comment)

		stock_doc.save(ignore_permissions=True)

		now = datetime.now()
		frappe.session.user

		new_tracking_doc = frappe.new_doc("Vehicle Tracking")

		tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

		new_tracking_doc.vin_serial_no = stock_doc.name
		new_tracking_doc.action_summary = "Vehicle Received into Dealer Stock"
		new_tracking_doc.status = "Successful"
		new_tracking_doc.type = "EDP Online"
		new_tracking_doc.request_datetime = tracking_date_time

		new_tracking_doc.request = (
			f"VIN/Serial No {stock_doc.name} has been moved to Dealer {dealer} by System"
		)

		new_tracking_doc.insert(ignore_permissions=True)

		frappe.db.commit()

		vinno = stock_doc.name

		frappe.msgprint(f"Vehicle {vinno}'s details have been updated")
	except Exception as e:
		frappe.msgprint(f"An error occurred: {e!s}")

	return "Success"


@frappe.whitelist()
def auto_move_stock_hq_transit(vinno, hq, dealer, model, rate):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
	com_doc = frappe.get_doc("Company", hq, ignore_permissions=True)
	serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
	current_warehouse = _resolve_vehicle_source_warehouse(vinno, stock_doc=stock_doc, serial_doc=serial_doc)

	if not current_warehouse:
		frappe.throw(f"Could not determine source warehouse for VIN {vinno}.")

	transit_warehouse = "Goods In Transit - " + str(com_doc.abbr)

	new_transfer = frappe.new_doc("Stock Entry")

	new_transfer.stock_entry_type = "Material Transfer"
	new_transfer.company = hq
	new_transfer.custom_dealer = dealer

	new_transfer.append(
		"items",
		{
			"s_warehouse": current_warehouse,
			"t_warehouse": transit_warehouse,
			"item_code": model,
			"qty": 1,
			"uom": "Unit",
			"basic_rate": rate,
			"use_serial_batch_fields": 1,
			"serial_no": stock_doc.name,
			"allow_zero_valuation_rate": 1,
		},
	)

	new_transfer.insert(ignore_permissions=True)
	new_transfer.submit()

	stock_doc.target_warehouse = transit_warehouse
	stock_doc.dealer = hq

	if not stock_doc.in_transit_date:
		stock_doc.in_transit_date = frappe.utils.today()

	comment = f"Vehicle {stock_doc.name} has been transferred to Head Office In Transit warehouse: {transit_warehouse}"

	stock_doc.add_comment("Comment", comment)

	stock_doc.save(ignore_permissions=True)

	now = datetime.now()
	frappe.session.user

	new_tracking_doc = frappe.new_doc("Vehicle Tracking")

	tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

	new_tracking_doc.vin_serial_no = stock_doc.name
	new_tracking_doc.action_summary = "Vehicle moved to In Trasit Warehouse"
	new_tracking_doc.status = "Successful"
	new_tracking_doc.type = "EDP Online"
	new_tracking_doc.request_datetime = tracking_date_time

	new_tracking_doc.request = f"VIN/Serial No {stock_doc.name} has been moved to Head Office In Transit warehouse {transit_warehouse} by System"

	new_tracking_doc.insert(ignore_permissions=True)

	frappe.db.commit()

	vinno = stock_doc.name

	frappe.msgprint(f"Vehicle {vinno}'s details have been updated")
	return


@frappe.whitelist()
def auto_move_stock_dealer(vinno, company, dealer, model, rate):
	# Ignore permissions while loading the documents
	stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
	com_doc = frappe.get_doc("Company", dealer, ignore_permissions=True)
	serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
	current_warehouse = _resolve_vehicle_source_warehouse(vinno, stock_doc=stock_doc, serial_doc=serial_doc)

	if not current_warehouse:
		frappe.throw(f"Could not determine source warehouse for VIN {vinno}.")

	if not com_doc.custom_default_vehicles_stock_warehouse:
		com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
		com_doc.save(ignore_permissions=True)

	# Create Material Issue
	new_issue = frappe.new_doc("Stock Entry")
	new_issue.stock_entry_type = "Material Issue"
	new_issue.company = company

	new_issue.append(
		"items",
		{
			"s_warehouse": current_warehouse,
			"item_code": model,
			"qty": 1,
			"uom": "Unit",
			"basic_rate": rate,
			"use_serial_batch_fields": 1,
			"serial_no": vinno,
			"allow_zero_valuation_rate": 1,
		},
	)

	new_issue.insert(ignore_permissions=True)
	new_issue.submit()

	# Create Material Receipt
	new_receipt = frappe.new_doc("Stock Entry")
	new_receipt.stock_entry_type = "Material Receipt"
	new_receipt.company = dealer

	new_receipt.append(
		"items",
		{
			"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
			"item_code": model,
			"qty": 1,
			"uom": "Unit",
			"basic_rate": rate,
			"use_serial_batch_fields": 1,
			"serial_no": vinno,
			"allow_zero_valuation_rate": 1,
		},
	)

	new_receipt.insert(ignore_permissions=True)
	new_receipt.submit()

	# Update the Equipment Stock with the new dealer and warehouse details
	stock_doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
	stock_doc.dealer = dealer
	stock_doc.availability_status = "Available"
	stock_doc.dealer_to_dealer_order_no = None

	comment = f"Vehicle has been transferred from Dealer: {company} to Dealer: {dealer}"

	stock_doc.add_comment("Comment", comment)

	stock_doc.save(ignore_permissions=True)

	now = datetime.now()
	user = frappe.session.user

	new_tracking_doc = frappe.new_doc("Vehicle Tracking")

	tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

	new_tracking_doc.vin_serial_no = stock_doc.name
	new_tracking_doc.action_summary = "Vehicle Received into Stock"
	new_tracking_doc.status = "Successful"
	new_tracking_doc.type = "EDP Online"
	new_tracking_doc.request_datetime = tracking_date_time

	new_tracking_doc.request = f"VIN/Serial No {stock_doc.name} has been moved to Dealer {dealer} from Dealer {company} by user {user}"

	new_tracking_doc.insert(ignore_permissions=True)

	frappe.db.commit()

	vinno = stock_doc.name
	frappe.msgprint(f"Vehicle {vinno}'s details have been updated")

	return {"message": "Success"}


@frappe.whitelist()
def update_sales_order_dealer(docname, vinno):
	# Update the sales order document with the new VIN number
	sales_doc = frappe.get_doc("Sales Order", {"custom_dealer_to_dealer_order_document_id": docname})
	if sales_doc:
		for item in sales_doc.items:
			item.custom_vinserial_no = vinno
		sales_doc.save(ignore_permissions=True)
		frappe.db.commit()
	else:
		frappe.throw("Sales Order not found for the specified document.")


@frappe.whitelist()
def check_dealer_to_dealer_orders_with_vin(company, vinno, current_docname):
	# Query to check for Dealer to Dealer Equipment Orders with the specified VIN and company
	dealer_orders = frappe.get_all(
		"Vehicles Dealer to Dealer Order",
		filters={
			"order_placed_to": company,
			"vin_serial_no": vinno,
			"status": ["not in", ["Cancelled", "Declined"]],
			"name": ["!=", current_docname],
		},
		fields=["name"],
	)

	# Return the list of matching document names, or None if no matches
	return [order["name"] for order in dealer_orders] if dealer_orders else None


@frappe.whitelist()
def auto_move_stock_delivery_note(doc, event=None):
	try:
		doc = frappe.get_doc("Delivery Note", doc.name)

		for item in doc.items:
			if item.serial_no:
				com_doc = frappe.get_doc("Company", doc.customer, ignore_permissions=True)

				if not com_doc.custom_default_vehicles_stock_warehouse:
					com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
					com_doc.save(ignore_permissions=True)

				new_receipt = frappe.new_doc("Stock Entry")
				new_receipt.stock_entry_type = "Material Receipt"
				new_receipt.company = doc.customer

				new_receipt.append(
					"items",
					{
						"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
						"item_code": item.item_code,
						"qty": 1,
						"uom": "Unit",
						"basic_rate": item.rate,
						"use_serial_batch_fields": 1,
						"serial_no": item.serial_no,
						"allow_zero_valuation_rate": 1,
					},
				)

				new_receipt.insert(ignore_permissions=True)
				new_receipt.submit()

				now = datetime.now()
				user = frappe.session.user

				new_tracking_doc = frappe.new_doc("Vehicle Tracking")

				tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

				new_tracking_doc.vin_serial_no = item.serial_no
				new_tracking_doc.action_summary = "Vehicle Received into Stock"
				new_tracking_doc.status = "Successful"
				new_tracking_doc.type = "EDP Online"
				new_tracking_doc.request_datetime = tracking_date_time

				new_tracking_doc.request = (
					f"VIN/Serial No {item.serial_no} has been moved to Dealer {doc.customer} by user {user}"
				)

				new_tracking_doc.insert(ignore_permissions=True)

				frappe.db.commit()

				frappe.log_error(f"Stock Entry {new_receipt.name} created for Delivery Note {doc.name}")

	except Exception as e:
		frappe.log_error(message=f"Error in Stock Entry creation: {e!s}", title="Stock Entry Error")


@frappe.whitelist()
def auto_move_stock_hq_cancel(vinno, hq, dealer, model, rate, hq_comment):
	try:
		stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
		com_doc = frappe.get_doc("Company", dealer, ignore_permissions=True)
		serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
		current_warehouse = _resolve_vehicle_source_warehouse(vinno, stock_doc=stock_doc, serial_doc=serial_doc)

		if not current_warehouse:
			frappe.throw(f"Could not determine source warehouse for VIN {vinno}.")

		if not com_doc.custom_default_vehicles_stock_warehouse:
			com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
			com_doc.save(ignore_permissions=True)

		new_issue = frappe.new_doc("Stock Entry")

		new_issue.stock_entry_type = "Material Issue"
		new_issue.company = hq

		new_issue.append(
			"items",
			{
				"s_warehouse": current_warehouse,
				"item_code": model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
				"allow_zero_valuation_rate": 1,
			},
		)

		new_issue.insert(ignore_permissions=True)
		new_issue.submit()

		new_receipt = frappe.new_doc("Stock Entry")

		new_receipt.stock_entry_type = "Material Receipt"
		new_receipt.company = dealer

		new_receipt.append(
			"items",
			{
				"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
				"item_code": model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
				"allow_zero_valuation_rate": 1,
			},
		)

		new_receipt.insert(ignore_permissions=True)
		new_receipt.submit()

		stock_doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
		stock_doc.dealer = dealer

		availability_status = stock_doc.availability_status
		user = frappe.user.name
		hq_comment = f"Head Office Vehicle Order has been cancelled by {user} \n User comment: {hq_comment}. "

		if availability_status == "Reserved":
			reserve_doc = frappe.get_doc("Reserved Vehicles", {"vin_serial_no": stock_doc.vin_serial_no})
			reserve_doc.status = "Available"
			reserve_doc.add_comment("Comment", hq_comment)
			reserve_doc.save(ignore_permissions=True)
			reserve_doc.submit(ignore_permissions=True)
		elif availability_status == "Pending Sale":
			sale_doc = frappe.get_doc("Vehicle Retail", stock_doc.vin_serial_no)
			sale_doc.status = "Declined"
			sale_doc.add_comment("Comment", hq_comment)
			sale_doc.save(ignore_permissions=True)
			sale_doc.submit(ignore_permissions=True)

		stock_doc.status = "Allocated To Order"

		comment = "Vehicle has been transferred from Dealer to Head Office"

		stock_doc.add_comment("Comment", comment)

		stock_doc.save(ignore_permissions=True)

		frappe.db.commit()

		vinno = stock_doc.name

		frappe.msgprint(f"Vehicle {vinno}'s details have been updated")
	except Exception as e:
		frappe.msgprint(f"An error occurred: {e!s}")

	return "Success"


def ensure_vehicle_serial_in_ho_default_warehouse(vinno, ho_company, model, rate):
	if not vinno or not ho_company or not frappe.db.exists("Vehicle Stock", vinno):
		return
	if not frappe.db.exists("Company", ho_company):
		return

	stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
	if stock_doc.dealer != ho_company:
		return

	ho_com_doc = frappe.get_doc("Company", ho_company, ignore_permissions=True)
	if not ho_com_doc.custom_default_vehicles_stock_warehouse:
		ho_com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + ho_com_doc.abbr
		ho_com_doc.save(ignore_permissions=True)

	default_wh = ho_com_doc.custom_default_vehicles_stock_warehouse
	item_code = model or stock_doc.model
	if not item_code:
		return

	basic_rate = rate or 0
	serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
	current_wh = serial_doc.warehouse

	if current_wh != default_wh:
		transfer = frappe.new_doc("Stock Entry")
		transfer.stock_entry_type = "Material Transfer"
		transfer.company = ho_company
		transfer.append(
			"items",
			{
				"s_warehouse": current_wh,
				"t_warehouse": default_wh,
				"item_code": item_code,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": basic_rate,
				"use_serial_batch_fields": 1,
				"serial_no": vinno,
				"allow_zero_valuation_rate": 1,
			},
		)
		transfer.insert(ignore_permissions=True)
		transfer.submit()
		serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)

	if serial_doc.warehouse != default_wh:
		return

	stock_doc.reload()
	changed = False
	if stock_doc.in_transit_date:
		stock_doc.in_transit_date = None
		changed = True
	if (stock_doc.target_warehouse or "") != default_wh:
		stock_doc.target_warehouse = default_wh
		changed = True
	if changed:
		stock_doc.flags.ignore_version = True
		stock_doc.save(ignore_permissions=True)


def auto_move_stock_to_ho(vinno, ho_company, model, rate):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
	if not stock_doc.dealer:
		return

	if stock_doc.dealer == ho_company:
		ensure_vehicle_serial_in_ho_default_warehouse(vinno, ho_company, model, rate)
		return

	from_dealer = stock_doc.dealer
	serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)
	current_warehouse = _resolve_vehicle_source_warehouse(vinno, stock_doc=stock_doc, serial_doc=serial_doc)

	if not current_warehouse:
		frappe.throw(f"Could not determine source warehouse for VIN {vinno}.")

	ho_com_doc = frappe.get_doc("Company", ho_company, ignore_permissions=True)
	if not ho_com_doc.custom_default_vehicles_stock_warehouse:
		ho_com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + ho_com_doc.abbr
		ho_com_doc.save(ignore_permissions=True)

	issue = frappe.new_doc("Stock Entry")
	issue.stock_entry_type = "Material Issue"
	issue.company = from_dealer
	issue.append("items", {
		"s_warehouse": current_warehouse,
		"item_code": model, "qty": 1, "uom": "Unit",
		"basic_rate": rate or 0,
		"use_serial_batch_fields": 1, "serial_no": vinno,
		"allow_zero_valuation_rate": 1,
	})
	issue.insert(ignore_permissions=True)
	issue.submit()

	receipt = frappe.new_doc("Stock Entry")
	receipt.stock_entry_type = "Material Receipt"
	receipt.company = ho_company
	receipt.append("items", {
		"t_warehouse": ho_com_doc.custom_default_vehicles_stock_warehouse,
		"item_code": model, "qty": 1, "uom": "Unit",
		"basic_rate": rate or 0,
		"use_serial_batch_fields": 1, "serial_no": vinno,
		"allow_zero_valuation_rate": 1,
	})
	receipt.insert(ignore_permissions=True)
	receipt.submit()

	stock_doc.reload()
	stock_doc.target_warehouse = ho_com_doc.custom_default_vehicles_stock_warehouse
	stock_doc.dealer = ho_company
	stock_doc.flags.ignore_version = True
	stock_doc.save(ignore_permissions=True)

	ensure_vehicle_serial_in_ho_default_warehouse(vinno, ho_company, model, rate)
