import frappe


@frappe.whitelist()
def update_customer_address(customer, new_address):
	if customer and new_address:
		customer_doc = frappe.get_doc("Customer", customer)
		customer_doc.primary_address = new_address
		customer_doc.save()
		return True
	return False
