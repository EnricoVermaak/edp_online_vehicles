# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesDealBuilder(Document):
	@frappe.whitelist()
	def get_otp_items(self):
		otp_items = []

		template_doc = frappe.get_doc("Vehicle Deal Builder Template", self.dealer)

		if template_doc:
			for row in template_doc.otp_items:
				otp_items.append(
					{"description": row.description, "disable_delete_function": row.disable_delete_function}
				)

		return otp_items
