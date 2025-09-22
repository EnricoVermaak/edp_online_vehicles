import frappe


@frappe.whitelist()
def get_sales_person(user=None):
	if user:
		return frappe.db.get_value("User", user, "full_name")
