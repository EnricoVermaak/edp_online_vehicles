import frappe


@frappe.whitelist()
def get_country_doc(country):
	if frappe.db.exists("Country", country):
		return frappe.get_doc("Country", country)
