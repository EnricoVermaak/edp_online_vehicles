import frappe


@frappe.whitelist()
def get_company_address(default_company):
	address = frappe.get_all(
		"Dynamic Link", {"link_doctype": "Company", "link_name": default_company}, ["parent"]
	)
	return address[0].parent
