# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from datetime import datetime

import frappe
from frappe.model.document import Document


class VehicleRequestForCredit(Document):
	def validate(self):
		if self.status == "Approved":
			hq_order_doc = frappe.get_doc("Head Office Vehicle Orders", self.order_no)

			if hq_order_doc:
				status = frappe.db.get_single_value("Vehicle Stock Settings", "change_order_status_to")

				hq_order_doc.status = status if status else "Pending"
				hq_order_doc.vinserial_no = None

				hq_order_doc.add_comment(
					"Comment",
					f"VIN/Serial No {self.vin_serial_no} un-allocated. Request For Credit {self.name} approved.",
				)

				hq_order_doc.save(ignore_permissions=True)

				stock_doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)

				if stock_doc:
					reserve_docs = frappe.db.get_all(
						"Reserved Vehicles",
						filters={"vin_serial_no": self.vin_serial_no, "status": "Reserved"},
						pluck="name",
					)

					for docname in reserve_docs:
						reserve_doc = frappe.get_doc("Reserved Vehicles", docname)

						if reserve_doc:
							reserve_doc.status = "Available"
							reserve_doc.save(ignore_permissions=True)
							reserve_doc.submit()

					stock_doc.availability_status = "Available"
					stock_doc.hq_order_no = None
					stock_doc.original_purchasing_dealer = ""
					stock_doc.ho_invoice_no = ""
					stock_doc.ho_invoice_amt = ""
					stock_doc.ho_invoice_date = ""

					comment = (
						f"Vehicle allocation has been removed from Head Office order: {hq_order_doc.name}"
					)

					stock_doc.add_comment("Comment", comment)

					hq_order_docs = frappe.db.get_all(
						"Head Office Vehicle Orders",
						filters={
							"model": hq_order_doc.model,
							"colour": hq_order_doc.colour,
							"vinserial_no": "",
						},
						fields=["name"],
					)

					for doc in hq_order_docs:
						hq_doc = frappe.get_doc("Head Office Vehicle Orders", doc.name)

						# Fetch existing tags
						existing_tags = hq_doc.get_tags()

						# Add the 'Stock Available' tag if it doesn't already exist
						if "Stock Available" not in existing_tags:
							hq_doc.add_tag("Stock Available")

					stock_doc.save(ignore_permissions=True)

					now = datetime.now()

					new_tracking_doc = frappe.new_doc("Vehicle Tracking")

					tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

					new_tracking_doc.vin_serial_no = self.vin_serial_no
					new_tracking_doc.action_summary = (
						f"Vehicle un-allocated from order {hq_order_doc.name} - Credit Request Approved"
					)
					new_tracking_doc.request_datetime = tracking_date_time
					new_tracking_doc.type = "EDP Online"
					new_tracking_doc.status = "Successful"

					new_tracking_doc.request = f"VIN/Serial No {self.vin_serial_no} has been removed from Order {hq_order_doc.name} by System"

					new_tracking_doc.insert(ignore_permissions=True)

					frappe.db.commit()

					return

	def after_insert(self):
		now = datetime.now()

		new_tracking_doc = frappe.new_doc("Vehicle Tracking")

		tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

		new_tracking_doc.vin_serial_no = self.vin_serial_no
		new_tracking_doc.action_summary = f"Request for Credit {self.name} created"
		new_tracking_doc.request_datetime = tracking_date_time
		new_tracking_doc.type = "EDP Online"
		new_tracking_doc.status = "Successful"

		new_tracking_doc.request = f"New Request for Credit created for VIN/Serial No: {self.vin_serial_no}"

		new_tracking_doc.insert(ignore_permissions=True)

		frappe.db.commit()
