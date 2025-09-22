import frappe


def get_permission(doc, method=None):
	if not frappe.conf.developer_mode and not frappe.flags.in_migrate:
		frappe.throw("Cannot edit because Developer Mode is Disabled")
