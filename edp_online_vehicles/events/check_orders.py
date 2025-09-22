import frappe
from frappe.utils import now_datetime


@frappe.whitelist()
def check_orders_schedule():
	order_docs = frappe.get_all("Vehicle Order", filters={"docstatus": 0}, fields=["name"])

	current_time = now_datetime()

	for order in order_docs:
		order_doc = frappe.get_doc("Vehicle Order", order.name)

		if order_doc and order_doc.order_date_time:
			if order_doc.order_date_time <= current_time:
				if len(order_doc.vehicles_basket) > 0:
					order_doc.submit()
					frappe.db.commit()


@frappe.whitelist()
def check_if_stock_available(model, colour):
	head_office = frappe.get_all("Company", filters={"custom_head_office": 1}, fields=["name"], limit=1)

	if not head_office:
		frappe.throw("Could not find head office. Please ensure a head office has been selected.")

	head_office_name = head_office[0].name

	vehicles = frappe.get_all(
		"Vehicle Stock",
		filters={
			"model": model,
			"colour": colour,
			"availability_status": "available",
			"dealer": head_office_name,
		},
		fields=["vin_serial_no"],
	)

	return bool(vehicles)
