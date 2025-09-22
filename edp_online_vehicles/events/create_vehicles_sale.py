from datetime import datetime

import frappe


@frappe.whitelist()
def create_vehicles_sale(
	vehicles_data, dealer, status, sale_type, finance_method, sales_person, customer, finance_by
):
	vehicles_data = frappe.parse_json(vehicles_data)

	new_doc = frappe.new_doc("Vehicle Retail")
	new_doc.dealer = dealer
	new_doc.status = status
	new_doc.sale_type = sale_type
	new_doc.finance_method = finance_method
	new_doc.sales_person = sales_person
	new_doc.customer = customer

	if finance_by:
		new_doc.financed_by = finance_by

	for vehicle in vehicles_data:
		vinno = vehicle.get("vin_serial_no")

		stock_doc = frappe.get_doc("Vehicle Stock", vinno)

		ho_invoice_amount = stock_doc.ho_invoice_amt

		if vehicle.get("retail_amount"):
			retail_amount = vehicle.get("retail_amount")
			profit_amount = retail_amount - ho_invoice_amount
			profit_percentage = profit_amount / retail_amount * 100
		else:
			retail_amount = 0
			profit_amount = retail_amount - ho_invoice_amount
			profit_percentage = -100

		new_doc.append(
			"vehicles_sale_items",
			{
				"vin_serial_no": vinno,
				"model": vehicle.get("model"),
				"colour": vehicle.get("colour"),
				"retail_amount": vehicle.get("retail_amount"),
				"profit_loss_amount": profit_amount,
				"profit_loss_": profit_percentage,
			},
		)

		change_vehicles_stock_availability_status("Pending Sale", vinno)

	new_doc.insert(ignore_permissions=True)
	new_doc.save(ignore_permissions=True)

	return new_doc.name


@frappe.whitelist()
def get_vehicles_stock_availability_status(status, vinno, docname):
	vinno = vinno.split(",")

	status_doc = frappe.get_doc("Vehicle Sale Status", status)

	availability_status = status_doc.availability_status
	automatically_submit_document = status_doc.automatically_submit_document

	for vin in vinno:
		change_vehicles_stock_availability_status(availability_status, vin, docname)

	if automatically_submit_document == 1:
		return True
	else:
		return False


@frappe.whitelist()
def change_vehicles_stock_availability_status(availability_status, vinno, docname=None):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno)
	doc = frappe.get_doc("Vehicle Retail", docname)

	stock_doc.availability_status = availability_status

	if doc.sale_type == "Fleet":
		stock_doc.type = "Fleet"

	stock_doc.save(ignore_permissions=True)
	frappe.db.commit()

	if availability_status == "Sold":
		remove_from_stock_on_sale(docname)


@frappe.whitelist()
def remove_from_stock_on_sale(docname):
	doc = frappe.get_doc("Vehicle Retail", docname)

	# List to hold VIN numbers that failed to create a material entry
	failed_vins = []

	for stock in doc.vehicles_sale_items:
		# Check if the Serial No exists for the given VIN
		if not frappe.db.exists("Serial No", stock.vin_serial_no):
			# If the Serial No does not exist, add VIN to failed list and continue
			failed_vins.append(stock.vin_serial_no)
			continue

		stock_doc = frappe.get_doc("Vehicle Stock", stock.vin_serial_no, ignore_permissions=True)
		serial_doc = frappe.get_doc("Serial No", stock.vin_serial_no, ignore_permissions=True)

		# Check if the serial_doc has a source warehouse
		if not serial_doc.warehouse:
			# If no warehouse is set, add VIN to failed list and continue to the next
			failed_vins.append(stock.vin_serial_no)
			continue

		new_issue = frappe.new_doc("Stock Entry")

		new_issue.stock_entry_type = "Material Issue"
		new_issue.company = doc.dealer

		new_issue.append(
			"items",
			{
				"s_warehouse": serial_doc.warehouse,
				"item_code": stock.model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": stock.retail_amount,
				"use_serial_batch_fields": 1,
				"serial_no": stock.vin_serial_no,
			},
		)

		# Insert and submit the stock entry document
		new_issue.insert(ignore_permissions=True)
		new_issue.submit()

		# Update the Vehicle Stock document
		equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": stock.vin_serial_no}, "name")

		if equip_doc:
			current_date = frappe.utils.nowdate()
			stock_doc = frappe.get_doc("Vehicle Stock", equip_doc, ignore_permissions=True)

			# Fetch the warranty_period from the related model
			warranty_period = frappe.get_value("Model Administration", stock_doc.model, "warranty_period")

			# Calculate warranty_end_date
			if warranty_period:
				int(warranty_period) * 365
				warranty_start_datetime = datetime.strptime(current_date, "%Y-%m-%d")
				warranty_end_datetime = warranty_start_datetime.replace(
					year=warranty_start_datetime.year + int(warranty_period)
				)
				warranty_end_date = warranty_end_datetime.strftime("%Y-%m-%d")
			else:
				warranty_end_date = None

			# Update the Vehicle Stock document
			if doc.customer:
				stock_doc.customer = doc.customer
				stock_doc.dealer = doc.dealer

			elif doc.fleet_customer:
				stock_doc.fleet_customer = doc.fleet_customer

			stock_doc.retail_date = doc.retail_date
			stock_doc.warranty_start_date = current_date
			stock_doc.warranty_end_date = warranty_end_date

			# # Update the Serial No document with warranty period and expiry date
			# serial_doc.warranty_expiry_date = warranty_end_date
			# serial_doc.warranty_period = warranty_period_days
			# serial_doc.save(ignore_permissions=True)

			comment = f"Vehicle {stock_doc.name} has been sold by Dealer: {doc.dealer} to Customer: {doc.customer_name}"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)

			now = datetime.now()
			user = frappe.session.user

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = stock_doc.name
			new_tracking_doc.action_summary = "Vehicle Received into Stock"
			new_tracking_doc.request_datetime = tracking_date_time

			new_tracking_doc.request = (
				f"VIN/Serial No {stock_doc.name} has been sold to customer {doc.customer_name} by user {user}"
			)

			new_tracking_doc.insert(ignore_permissions=True)

			vinno = stock_doc.vin_serial_no

		frappe.db.commit()

	# If there were failures, show the list in a message box
	if failed_vins:
		message = "The following VIN numbers could not create a material entry due to missing warehouse information or other issues:<br><br>"
		message += "<br>".join(f"- {vin}" for vin in failed_vins)
		frappe.msgprint(message)
	else:
		frappe.msgprint(f"Vehicles with VIN: {vinno} sold successfully.")
		return "Success"


@frappe.whitelist()
def return_to_stock_on_sale(docname):
	doc = frappe.get_doc("Vehicle Retail", docname)

	for stock in doc.vehicles_sale_items:
		stock_doc = frappe.get_doc("Vehicle Stock", stock.vin_serial_no, ignore_permissions=True)

		new_issue = frappe.new_doc("Stock Entry")

		new_issue.stock_entry_type = "Material Receipt"
		new_issue.company = doc.dealer

		new_issue.append(
			"items",
			{
				"t_warehouse": stock_doc.target_warehouse,
				"item_code": stock.model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": stock.retail_amount,
				"use_serial_batch_fields": 1,
				"serial_no": stock.vin_serial_no,
			},
		)

		new_issue.insert(ignore_permissions=True)
		new_issue.submit()

		stock_doc.customer = ""
		stock_doc.dealer = doc.dealer
		stock_doc.warranty_start_date = ""
		stock_doc.warranty_end_date = ""
		stock_doc.availability_status = "Available"

		comment = "Vehicle sale has been cancelled"

		stock_doc.add_comment("Comment", comment)

		stock_doc.save(ignore_permissions=True)

		stock_doc.vin_serial_no

		frappe.db.commit()
