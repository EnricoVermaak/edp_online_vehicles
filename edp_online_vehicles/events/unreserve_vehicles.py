import frappe


@frappe.whitelist()
def unreserve_vehicles(docnames):
	docnames = frappe.parse_json(docnames)

	for docname in docnames:
		stock_doc = frappe.get_doc("Vehicle Stock", docname)

		stock_doc.availability_status = "Available"
		stock_doc.reserve_reason = ""

		stock_doc.save(ignore_permissions=True)

		# Remove any Reserved Vehicles documents linked to this VIN
		reserve_docs = frappe.get_all(
			"Reserved Vehicles", filters={"vin_serial_no": stock_doc.name}, pluck="name"
		)

		for reserve_docname in reserve_docs:
			reserve_doc = frappe.get_doc("Reserved Vehicles", reserve_docname)
			reserve_doc.flags.ignore_permissions = True

			if reserve_doc.docstatus == 1:
				reserve_doc.cancel()

			reserve_doc.delete()

	frappe.db.commit()
	return True
