import frappe


def set_job_card_no_on_pick_list(doc, method=None):
	for row in doc.locations:
		sales_order_name = row.sales_order

		sales_order = frappe.get_doc("Sales Order", sales_order_name)
		doc.custom_job_card_no = sales_order.custom_job_reference


def set_job_card_no_delivery_note(doc, method=None):
	for row in doc.items:
		sales_order_name = row.against_sales_order
		if sales_order_name:
			sales_order = frappe.get_doc("Sales Order", sales_order_name)
			doc.custom_job_card_no = sales_order.custom_job_reference
