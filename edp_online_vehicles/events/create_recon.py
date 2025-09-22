import frappe


@frappe.whitelist()
def create_recon():
	doc = frappe.new_doc("Vehicles Recon")

	doc.submitted_by = frappe.defaults.get_default("user")
	doc.dealer = frappe.defaults.get_default("company")
	doc.status = "Pending"

	doc.insert(ignore_permissions=True)
	doc.save(ignore_permissions=True)
	frappe.db.commit

	return doc.name


@frappe.whitelist()
def check_status(docname):
	status = frappe.get_value("Vehicles Recon", {"name": docname}, "status")

	if status == "Completed":
		return True
	else:
		return False
