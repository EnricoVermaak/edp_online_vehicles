import frappe


@frappe.whitelist()
def move_stock_on_invoice(docname):
	doc = frappe.get_doc("Sales Invoice", docname, ignore_permissions=True)

	for item in doc.items:
		stock_doc = frappe.get_doc("Vehicle Stock", item.custom_vinserial_no, ignore_permissions=True)

		if frappe.db.exists("Company", doc.customer):
			stock_doc.dealer = doc.customer

			com_doc = frappe.get_doc("Company", doc.customer)
			serial_doc = frappe.get_doc("Serial No", item.custom_vinserial_no)

			new_issue = frappe.new_doc("Stock Entry")

			new_issue.stock_entry_type = "Material Issue"
			new_issue.company = doc.company

			new_issue.append(
				"items",
				{
					"s_warehouse": serial_doc.warehouse,
					"item_code": item.item_code,
					"qty": item.qty,
					"uom": item.uom,
					"basic_rate": item.rate,
					"use_serial_batch_fields": 1,
					"serial_no": stock_doc.name,
				},
			)

			new_issue.insert(ignore_permissions=True)
			new_issue.submit()

			new_receipt = frappe.new_doc("Stock Entry")

			new_receipt.stock_entry_type = "Material Receipt"
			new_receipt.company = doc.customer

			new_receipt.append(
				"items",
				{
					"t_warehouse": com_doc.custom_default_equipment_stock_warehouse,
					"item_code": item.item_code,
					"qty": item.qty,
					"uom": item.uom,
					"basic_rate": item.rate,
					"use_serial_batch_fields": 1,
					"serial_no": stock_doc.name,
				},
			)

			new_receipt.insert(ignore_permissions=True)
			new_receipt.submit()

			stock_doc.target_warehouse = com_doc.custom_default_equipment_stock_warehouse
			stock_doc.dealer = doc.customer

			stock_doc.save(ignore_permissions=True)

			frappe.db.commit()

			vinno = stock_doc.name

			frappe.msgprint(f"Vehicles {vinno}'s details have been updated")
			return
		else:
			frappe.msgprint(
				"Selected Customer Does not exist as a company. Please contact your head office admin."
			)
