from datetime import datetime

import frappe


@frappe.whitelist()
def allocate_vinno(hq_order_doc, vinno):
	if frappe.db.exists("Head Office Vehicle Orders", hq_order_doc):
		hq_doc = frappe.get_doc("Head Office Vehicle Orders", hq_order_doc)
		stock_doc = frappe.get_doc("Vehicle Stock", vinno)

		if hq_doc:
			hq_doc.vinserial_no = vinno

			hq_doc.save(ignore_permissions=True)

			stock_doc.availability_status = "Order Pending"
			stock_doc.hq_order_no = hq_order_doc

			comment = f"Vehicle has been allocated to Head Office order: {hq_order_doc}"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)

			now = datetime.now()
			user = frappe.session.user

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = vinno
			new_tracking_doc.action_summary = "Vehicle Received into Stock"
			new_tracking_doc.request_datetime = tracking_date_time

			new_tracking_doc.request = (
				f"VIN/Serial No {vinno} has been allocated to Order {hq_order_doc} by user {user}"
			)

			new_tracking_doc.insert(ignore_permissions=True)

			frappe.db.commit()

			return "Vehicle has been successfully allocated"
