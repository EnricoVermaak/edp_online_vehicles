import frappe


@frappe.whitelist()
def sort_data(docname):
	doc = frappe.get_doc("Delivery Trip", docname)

	doc.delivery_stops.sort(key=lambda x: x.customer)

	return doc


@frappe.whitelist()
def total_cust(docname):
	doc = frappe.get_doc("Delivery Trip", docname)

	# Get the list of customer names from the child table
	customer_names = [row.customer for row in doc.get("delivery_stops")]

	# Use a set to count unique customer names
	unique_customers = len(set(customer_names))

	return unique_customers


@frappe.whitelist()
def total_qty(docname):
	doc = frappe.get_doc("Delivery Trip", docname)

	total_qty = 0

	total_qty_list = (row.custom_inv_qty for row in doc.get("delivery_stops"))

	for qty in total_qty_list:
		total_qty = total_qty + qty

	return total_qty
