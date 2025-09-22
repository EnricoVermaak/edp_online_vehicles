# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesDealertoDealerOrder(Document):
	@frappe.whitelist()
	def allocate_vinno(self):
		stock_doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)

		if stock_doc:
			stock_doc.availability_status = "Order Pending"
			stock_doc.dealer_to_dealer_order_no = self.name

			comment = f"Vehicle has been allocated to Dealer to Dealer order: {self.name}"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)
			frappe.db.commit()

			return f"VIN/Serial No {self.vin_serial_no} has successfully been allocated to order {self.name}"

	@frappe.whitelist()
	def remove_allocated_vinno(self, previous_vinno_value):
		stock_doc = frappe.get_doc("Vehicle Stock", previous_vinno_value)

		if stock_doc:
			stock_doc.availability_status = "Available"
			stock_doc.dealer_to_dealer_order_no = None

			comment = f"Vehicle allocation has been removed from Dealer to Dealer order: {self.name}"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)
			frappe.db.commit()

			return (
				f"VIN/Serial No {previous_vinno_value} has successfully been removed from order {self.name}"
			)
