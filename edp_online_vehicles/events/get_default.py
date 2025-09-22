import frappe


@frappe.whitelist()
def get_default(doctype, fieldname):
	return frappe.db.get_value(doctype, {fieldname: 1}, "name")
