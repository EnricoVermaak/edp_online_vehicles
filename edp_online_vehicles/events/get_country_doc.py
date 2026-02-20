import frappe

@frappe.whitelist()
def get_country_doc(country):
	if not country:
		return []

	doc = frappe.get_doc("Country", country)

	return doc.get("custom_regions", [])
