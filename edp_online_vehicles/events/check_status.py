import frappe


@frappe.whitelist()
def default_check(doctype, fieldname):
	return frappe.db.exists(doctype, {fieldname: 1})
