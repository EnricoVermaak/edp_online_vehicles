# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesLocationMovement(Document):
	def validate(self):
		if self.status == "Approved":
			doc = frappe.get_doc("Vehicle Stock", self.vinserial_no, ignore_permissions=True)
			doc.customer = self.new_customer

			if self.new_location:
				doc.current_location = self.new_location

			doc.save(ignore_permissions=True)
