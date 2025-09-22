import frappe


@frappe.whitelist()
def adjust_company_name(doc, method=None):
	if doc.custom_customer_code:
		doc.company_name = append_customer_code_to_company_name(doc.company_name, doc.custom_customer_code)
		# frappe.publish_realtime("refresh")


def append_customer_code_to_company_name(company_name, customer_code):
	if company_name and customer_code:
		return f"{company_name} - {customer_code}"
