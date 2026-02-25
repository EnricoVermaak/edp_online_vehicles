import frappe
from frappe.utils import now_datetime, nowdate

@frappe.whitelist()
def check_orders_schedule():
    # logger = frappe.logger("vehicle_order_schedule")

    order_docs = frappe.get_all(
        "Vehicle Order",
        filters={"docstatus": 0},
        fields=["name", "order_date_time", "requested_delivery_date"]
    )

    current_time = now_datetime()

    for row in order_docs:
        try:
            order_doc = frappe.get_doc("Vehicle Order", row["name"])

            if not order_doc.order_date_time:
                continue

            if order_doc.order_date_time > current_time:
                continue

            if not order_doc.vehicles_basket or len(order_doc.vehicles_basket) == 0:
                continue

            if not order_doc.requested_delivery_date or order_doc.requested_delivery_date < order_doc.order_date_time.date():
                order_doc.requested_delivery_date = nowdate()

            order_doc.save()
            order_doc.submit()

        except Exception:
            logger.exception(f"Failed processing Vehicle Order {row['name']}")

    frappe.db.commit()
    return {"ok": True, "processed": len(order_docs)}
		


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
