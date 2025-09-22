import frappe


@frappe.whitelist()
def get_hq_company():
	return frappe.db.get_value("Company", {"custom_head_office": 1}, "name")


@frappe.whitelist()
def get_data_for_catalogue(part_no):
	data = []

	hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
	image = frappe.db.get_value("Item", {"name": part_no}, "image")

	data.append(hq_company)
	data.append(image)

	return data
