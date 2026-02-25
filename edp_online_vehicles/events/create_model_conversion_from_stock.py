import frappe


@frappe.whitelist()
def create_model_conversion_from_stock(convert_from_model, convert_to_model, docnames):
	if isinstance(docnames, str):
		import json
		docnames = json.loads(docnames) if docnames else []
	if not docnames:
		frappe.throw("Please select at least one Vehicle Stock record.")
	if not convert_from_model or not convert_to_model:
		frappe.throw("Convert From Model and Convert To Model are required.")

	doc = frappe.new_doc("Model Conversion")
	doc.model = convert_from_model
	doc.convert_to_model = convert_to_model
	doc.status = "Pending"

	for name in docnames:
		if frappe.db.exists("Vehicle Stock", name):
			doc.append("table_fgif", {"vin_serial_no": name})

	if not doc.table_fgif:
		frappe.throw("No valid Vehicle Stock records in selection.")

	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc.name
