import frappe


@frappe.whitelist()
def get_allow_retail_date_change():
	return frappe.get_value("Vehicle Stock Settings", None, "allow_retail_date_change")


@frappe.whitelist()
def get_allow_microdot_allocation_on_retail():
	return frappe.get_value("Vehicle Stock Settings", None, "allow_microdot_allocation_on_retail")


@frappe.whitelist()
def get_retail_settings():
	return {
		"allow_retail_date_change": get_allow_retail_date_change(),
		"allow_microdot_allocation_on_retail": get_allow_microdot_allocation_on_retail(),
	}
