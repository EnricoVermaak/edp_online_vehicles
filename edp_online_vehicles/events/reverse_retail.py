from datetime import datetime

import frappe


@frappe.whitelist()
def reverse_retail(docname):
	doc = frappe.get_doc("Vehicle Retail", docname)

	com_doc = frappe.get_doc("Company", doc.dealer)

	if not com_doc.custom_default_vehicles_stock_warehouse:
		com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
		com_doc.save(ignore_permissions=True)

	# List to hold VIN numbers that failed to create a material entry
	failed_vins = []

	for stock in doc.vehicles_sale_items:
		# Check if the Serial No exists for the given VIN
		if not frappe.db.exists("Serial No", stock.vin_serial_no):
			# If the Serial No does not exist, add VIN to failed list and continue
			failed_vins.append(stock.vin_serial_no)
			continue

		if not frappe.db.exists("Vehicle Stock", stock.vin_serial_no):
			failed_vins.append(stock.vin_serial_no)
			continue

		stock_doc = frappe.get_doc("Vehicle Stock", stock.vin_serial_no, ignore_permissions=True)

		new_receipt = frappe.new_doc("Stock Entry")
		new_receipt.stock_entry_type = "Material Receipt"
		new_receipt.company = doc.dealer
		new_receipt.append(
			"items",
			{
				"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
				"item_code": stock.model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": stock.retail_amount,
				"use_serial_batch_fields": 1,
				"serial_no": stock.vin_serial_no,
			},
		)
		new_receipt.insert(ignore_permissions=True)
		new_receipt.submit()

		# Update the Vehicle Stock document
		equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": stock.vin_serial_no}, "name")

		if equip_doc:
			stock_doc = frappe.get_doc("Vehicle Stock", equip_doc, ignore_permissions=True)

			# Update the Vehicle Stock document
			if doc.customer:
				stock_doc.customer = ""
				stock_doc.customer_full_name = ""
				stock_doc.email = ""
				stock_doc.phone = ""
				stock_doc.mobile = ""
				stock_doc.address = ""

			elif doc.fleet_customer:
				stock_doc.fleet_customer = ""
				stock_doc.company_reg_no = ""
				stock_doc.fleet_customer_name = ""
				stock_doc.fleet_customer_email = ""
				stock_doc.fleet_code = ""
				stock_doc.fleet_customer_phone = ""
				stock_doc.fleet_customer_mobile = ""
				stock_doc.fleet_customer_address = ""

			stock_doc.retail_date = ""
			stock_doc.warranty_start_date = ""
			stock_doc.warranty_end_date = ""

			# # Update the Serial No document with warranty period and expiry date
			# serial_doc.warranty_expiry_date = warranty_end_date
			# serial_doc.warranty_period = warranty_period_days
			# serial_doc.save(ignore_permissions=True)

			comment = f"Vehicle {stock_doc.name} had it's Retail Reversed"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)

			doc.status = "Cancelled"
			doc.save(ignore_permissions=True)

			now = datetime.now()
			user = frappe.session.user

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = stock_doc.name
			new_tracking_doc.action_summary = "Retail Reversed"
			new_tracking_doc.request_datetime = tracking_date_time

			new_tracking_doc.request = (
				f"VIN/Serial No {stock_doc.name} had it's Retail Reversed by user {user}"
			)

			new_tracking_doc.insert(ignore_permissions=True)

		frappe.db.commit()
		return True
