import frappe


@frappe.whitelist()
def cancel_doc(doctype, doc, vinno, hq, dealer, model, rate, hq_comment):
	doc = frappe.get_doc(doctype, doc)

	doc.cancel()

	doc.add_comment("Comment", hq_comment)

	try:
		stock_doc = frappe.get_doc("Vehicle Stock", vinno, ignore_permissions=True)
		com_doc = frappe.get_doc("Company", dealer, ignore_permissions=True)
		serial_doc = frappe.get_doc("Serial No", vinno, ignore_permissions=True)

		if not com_doc.custom_default_vehicles_stock_warehouse:
			com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
			com_doc.save(ignore_permissions=True)

		new_issue = frappe.new_doc("Stock Entry")

		new_issue.stock_entry_type = "Material Issue"
		new_issue.company = hq

		new_issue.append(
			"items",
			{
				"s_warehouse": serial_doc.warehouse,
				"item_code": model,
				"qty": 1,
				"uom": "Unit",
				"basic_rate": rate,
				"use_serial_batch_fields": 1,
				"serial_no": stock_doc.name,
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
			},
		)

		new_receipt.insert(ignore_permissions=True)
		new_receipt.submit()

		stock_doc.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
		stock_doc.dealer = dealer

		availability_status = stock_doc.availability_status

		if availability_status == "Reserved":
			reserve_doc = frappe.get_doc("Reserved Vehicles", {"vin_serial_no": stock_doc.vin_serial_no})

			reserve_doc.status = "Available"

			reserve_doc.add_comment("Comment", hq_comment)

			reserve_doc.save()
			reserve_doc.submit()
		elif availability_status == "Pending Sale":
			sale_doc = frappe.get_doc("Vehicle Retail", stock_doc.vin_serial_no)
			sale_doc.status = "Declined"
			sale_doc.add_comment("Comment", hq_comment)
			sale_doc.save(ignore_permissions=True)
			sale_doc.submit()

		stock_doc.availability_status = "Allocated to Order"

		comment = "Vehicle has been transferred from Dealer to Head Office"

		stock_doc.add_comment("Comment", f"{comment} \n {hq_comment}")

		stock_doc.save(ignore_permissions=True)

		frappe.db.commit()

		vinno = stock_doc.name

		frappe.msgprint(f"Vehicle {vinno}'s details have been updated")
	except Exception as e:
		frappe.msgprint(f"An error occurred: {e!s}")

	return "Document Successfully cancelled"
