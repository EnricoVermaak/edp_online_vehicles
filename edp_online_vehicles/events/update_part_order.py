from datetime import timedelta

import frappe
import frappe.utils


@frappe.whitelist()
def update_part_order_time():
	hq_orders = frappe.get_all(
		"HQ Part Order", filters={"part_order_status": ["not in", ["Delivered", "Cancelled"]]}, pluck="name"
	)

	d2d_orders = frappe.get_all(
		"D2D Part Order", filters={"status": ["not in", ["Declined", "Cancelled", "Completed"]]}, pluck="name"
	)

	part_orders = frappe.get_all("Part Order", filters={"docstatus": 1}, pluck="name")

	for order in hq_orders:
		hq_doc = frappe.get_doc("HQ Part Order", order)

		now_dt = frappe.utils.now_datetime()

		if len(hq_doc.table_qmpy) > 0:
			time_diff = now_dt - frappe.utils.get_datetime(hq_doc.creation)
			new_delivery_time_str = timedelta_to_hhmmss(time_diff)

			hq_doc.order_delivery_time = new_delivery_time_str

			hq_doc.save(ignore_permissions=True)

	for order in d2d_orders:
		d2d_doc = frappe.get_doc("D2D Part Order", order)

		now_dt = frappe.utils.now_datetime()

		if len(d2d_doc.table_mzrh) > 0:
			time_diff = now_dt - frappe.utils.get_datetime(d2d_doc.creation)
			new_delivery_time_str = timedelta_to_hhmmss(time_diff)

			d2d_doc.order_delivery_time = new_delivery_time_str

			d2d_doc.save(ignore_permissions=True)

	for order in part_orders:
		order_doc = frappe.get_doc("Part Order", order)

		now_dt = frappe.utils.now_datetime()

		if len(order_doc.table_eaco) > 0:
			time_diff = now_dt - frappe.utils.get_datetime(order_doc.creation)
			new_delivery_time_str = timedelta_to_hhmmss(time_diff)

			order_doc.order_delivery_time = new_delivery_time_str

			order_doc.save(ignore_permissions=True)

	frappe.db.commit()
	return


def hhmmss_to_timedelta(time_str):
	"""Convert a HH:MM:SS string to a timedelta object."""
	h, m, s = map(int, time_str.split(":"))
	return timedelta(hours=h, minutes=m, seconds=s)


def timedelta_to_hhmmss(td):
	"""Convert a timedelta object to a HH:MM:SS string."""
	total_seconds = int(td.total_seconds())
	h = total_seconds // 3600
	m = (total_seconds % 3600) // 60
	s = total_seconds % 60
	return f"{h:02}:{m:02}:{s:02}"
