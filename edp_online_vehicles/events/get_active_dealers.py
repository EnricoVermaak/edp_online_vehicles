import frappe


@frappe.whitelist()
def get_active_dealers():
	return frappe.get_all("Company", filters={"custom_active": 1}, fields=["name"])
