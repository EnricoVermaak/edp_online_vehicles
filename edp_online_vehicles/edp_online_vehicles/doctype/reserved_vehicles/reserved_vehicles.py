# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime


class ReservedVehicles(Document):
	def after_submit(self):
		current_dt = now_datetime()

		history_doc = frappe.new_doc("Reserved Vehicles History")

		history_doc.vin_serial_no = self.vin_serial_no
		history_doc.model = self.model
		history_doc.dealer = self.dealer
		history_doc.vehicle_unreserved = current_dt
		history_doc.reserve_reason = self.reserve_reason
		history_doc.reserve_from_date = self.reserve_from_date
		history_doc.reserve_to_date = self.reserve_to_date
		history_doc.total_days = self.total_days
		history_doc.customer = self.customer
		history_doc.customer_full_name = self.customer_full_name
		history_doc.phone = self.phone
		history_doc.email = self.email
		history_doc.address = self.address

		history_doc.insert(ignore_permissions=True)
		history_doc.submit(ignore_permissions=True)

		frappe.delete_doc("Reserved Vehicles", self.name)

		frappe.db.commit()

	def on_update(self):
		if self.reserve_to_date:
			from_date = getdate(self.reserve_from_date)
			to_date = getdate(self.reserve_to_date)

			delta = to_date - from_date

			days_between = delta.days

			self.total_days = days_between
