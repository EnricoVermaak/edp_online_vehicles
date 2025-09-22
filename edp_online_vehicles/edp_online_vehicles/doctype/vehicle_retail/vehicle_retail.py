# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleRetail(Document):
	@frappe.whitelist()
	def update_dealer_customer(self):
		dealer_cust_doc = frappe.get_doc("Dealer Customer", self.customer)

		if dealer_cust_doc:
			dealer_cust_doc.email = self.customer_email
			dealer_cust_doc.mobile = self.customer_mobile
			dealer_cust_doc.phone = self.customer_phone
			dealer_cust_doc.address = self.customer_address

			dealer_cust_doc.save(ignore_permissions=True)
			frappe.db.commit()
