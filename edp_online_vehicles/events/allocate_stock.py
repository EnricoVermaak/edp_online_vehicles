from datetime import datetime

import frappe


@frappe.whitelist()
def allocate_stock(docnames, company, user):
	docnames = frappe.parse_json(docnames)
	failed_allocations = []

	# Start the allocation process
	for docname in docnames:
		try:
			doc = frappe.get_doc("Vehicle Stock", docname)

			# Check if Serial No exists for the current document
			if frappe.db.exists("Serial No", doc.name):
				com_doc = frappe.get_doc("Company", company)

				if not com_doc.custom_default_vehicles_stock_warehouse:
					com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
					com_doc.save(ignore_permissions=True)

				# Create Material Issue Stock Entry
				new_issue = frappe.new_doc("Stock Entry")
				new_issue.stock_entry_type = "Material Issue"
				new_issue.company = doc.dealer
				new_issue.append(
					"items",
					{
						"s_warehouse": doc.target_warehouse,
						"item_code": doc.model,
						"qty": 1,
						"uom": "Unit",
						"basic_rate": doc.cost_price_excl,
						"use_serial_batch_fields": 1,
						"serial_no": doc.name,
					},
				)
				new_issue.insert(ignore_permissions=True)
				new_issue.submit()

				# Create Material Receipt Stock Entry
				new_receipt = frappe.new_doc("Stock Entry")
				new_receipt.stock_entry_type = "Material Receipt"
				new_receipt.company = company
				new_receipt.append(
					"items",
					{
						"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
						"item_code": doc.model,
						"qty": 1,
						"uom": "Unit",
						"basic_rate": doc.cost_price_excl,
						"use_serial_batch_fields": 1,
						"serial_no": doc.name,
					},
				)
				new_receipt.insert(ignore_permissions=True)
				new_receipt.submit()

				# Update Equipment Stock document
				doc.dealer = company
				doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
				doc.availability_status = "Available"
				doc.save(ignore_permissions=True)

				now = datetime.now()

				new_tracking_doc = frappe.new_doc("Vehicle Tracking")

				tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

				new_tracking_doc.vin_serial_no = doc.name
				new_tracking_doc.action_summary = "Vehicle Received into Stock"
				new_tracking_doc.request_datetime = tracking_date_time

				new_tracking_doc.request = (
					f"VIN/Serial No {doc.name} has been allocated to Dealer {company} by user {user}"
				)

				new_tracking_doc.insert(ignore_permissions=True)

				frappe.db.commit()

			else:
				failed_allocations.append(doc.name)

		except Exception as e:
			frappe.logger().error(f"Error processing {docname}: {e!s}")
			failed_allocations.append(docname)

	# Final result
	if failed_allocations:
		failed_stock_list = "<br>- ".join(failed_allocations)
		frappe.msgprint(f"The following Stock do not have Serial No's:<br>- {failed_stock_list}")
	else:
		frappe.msgprint("Successfully allocated all selected stock.")


@frappe.whitelist()
def allocate_vehicle(docname, company, user):
	docname = docname

	doc = frappe.get_doc("Vehicle Stock", docname)

	# Check if Serial No exists for the current document
	if frappe.db.exists("Serial No", doc.name):
		com_doc = frappe.get_doc("Company", company)

		if not com_doc.custom_default_vehicles_stock_warehouse:
			com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
			com_doc.save(ignore_permissions=True)

		# Create Material Issue Stock Entry
		new_issue = frappe.new_doc("Stock Entry")
		new_issue.stock_entry_type = "Material Issue"
		new_issue.company = doc.dealer
		new_issue.append(
			"items",
			{
				"s_warehouse": doc.target_warehouse,
				"item_code": doc.model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": doc.cost_price_excl,
				"use_serial_batch_fields": 1,
				"serial_no": doc.name,
			},
		)
		new_issue.insert(ignore_permissions=True)
		new_issue.submit()

		# Create Material Receipt Stock Entry
		new_receipt = frappe.new_doc("Stock Entry")
		new_receipt.stock_entry_type = "Material Receipt"
		new_receipt.company = company
		new_receipt.append(
			"items",
			{
				"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
				"item_code": doc.model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": doc.cost_price_excl,
				"use_serial_batch_fields": 1,
				"serial_no": doc.name,
			},
		)
		new_receipt.insert(ignore_permissions=True)
		new_receipt.submit()

		# Update Equipment Stock document
		doc.dealer = company
		doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
		doc.availability_status = "Available"
		doc.save(ignore_permissions=True)

		now = datetime.now()

		new_tracking_doc = frappe.new_doc("Vehicle Tracking")

		tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

		new_tracking_doc.vin_serial_no = doc.name
		new_tracking_doc.action_summary = "Vehicle Allocated to Dealer"
		new_tracking_doc.request_datetime = tracking_date_time

		new_tracking_doc.request = (
			f"VIN/Serial No {doc.name} has been allocated to Dealer {company} by user {user}"
		)

		new_tracking_doc.insert(ignore_permissions=True)

		frappe.db.commit()
		frappe.msgprint("Successfully allocated Vehicle.")


@frappe.whitelist()
def bulk_allocate_stock(docnames, vinnos, colours, user):
	docnames = frappe.parse_json(docnames)
	vinnos = frappe.parse_json(vinnos)
	failed_allocations = []

	# Start the allocation process
	for docname in docnames:
		try:
			for vinno in vinnos:
				order_doc = frappe.get_doc("Head Office Vehicle Orders", docname)

				order_doc.vinserial_no = vinno

				order_doc.save(ignore_permissions=True)

				now = datetime.now()

				new_tracking_doc = frappe.new_doc("Vehicle Tracking")

				tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

				new_tracking_doc.vin_serial_no = vinno
				new_tracking_doc.action_summary = "Vehicle Allocated to Order"
				new_tracking_doc.request_datetime = tracking_date_time

				new_tracking_doc.request = f"VIN/Serial No {vinno} has been allocated to Dealer {order_doc.order_placed_by} by user {user}"

				new_tracking_doc.insert(ignore_permissions=True)

			frappe.db.commit()
		except Exception as e:
			frappe.logger().error(f"Error processing {docname}: {e!s}")
			failed_allocations.append(docname)

	frappe.msgprint("Successfully allocated all selected stock.")
