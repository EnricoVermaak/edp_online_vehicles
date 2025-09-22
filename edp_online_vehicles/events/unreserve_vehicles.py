import frappe


@frappe.whitelist()
def unreserve_vehicles(docnames):
	docnames = frappe.parse_json(docnames)

	for docname in docnames:
		stock_doc = frappe.get_doc("Vehicle Stock", docname)

		stock_doc.availability_status = "Available"
		stock_doc.reserve_reason = ""

		stock_doc.save(ignore_permissions=True)

	frappe.db.commit()
	return True
