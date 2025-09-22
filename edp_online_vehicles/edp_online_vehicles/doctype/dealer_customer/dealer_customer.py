# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DealerCustomer(Document):
	def validate(self):
		if self.customer_type == "Business":
			if frappe.db.exists("Customer", {"custom_customer_code": self.company_reg_no}):
				cust_doc = frappe.get_doc("Customer", self.company_reg_no)

				if cust_doc:
					if self.company_name:
						cust_doc.customer_name = self.company_name

					if self.address:
						cust_doc.primary_address = self.address

					if self.mobile:
						cust_doc.mobile_no = self.mobile

					if self.email:
						cust_doc.email_id = self.email

					if self.vat_no:
						cust_doc.custom_vat_no = self.vat_no

					cust_doc.save(ignore_permissions=True)
		else:
			if frappe.db.exists("Customer", {"custom_customer_code": self.customer_full_name}):
				cust_doc = frappe.get_doc("Customer", self.customer_full_name)

				if cust_doc:
					if self.customer_full_name:
						cust_doc.customer_name = self.customer_full_name

					if self.address:
						cust_doc.primary_address = self.address

					if self.mobile:
						cust_doc.mobile_no = self.mobile

					if self.email:
						cust_doc.email_id = self.email

					if self.vat_no:
						cust_doc.custom_vat_no = self.vat_no

					cust_doc.save(ignore_permissions=True)

		frappe.db.commit()

	def after_insert(self):
		cust_doc = frappe.new_doc("Customer")

		if self.customer_type == "Business":
			cust_doc.custom_customer_code = self.company_reg_no
			cust_doc.customer_name = self.company_name
		else:
			cust_doc.custom_customer_code = self.customer_full_name
			cust_doc.customer_name = self.customer_full_name

		if self.customer_type == "Business":
			customer_type = "Company"
		if self.customer_type == "Individual":
			customer_type = "Individual"
		if self.customer_type == "Foreigner":
			customer_type = "Individual"

		cust_doc.customer_type = customer_type

		if self.customer_full_name:
			cust_doc.customer_name = self.customer_full_name

		if self.address:
			cust_doc.primary_address = self.address

		if self.mobile:
			cust_doc.mobile_no = self.mobile

		if self.email:
			cust_doc.email_id = self.email

		if self.vat_no:
			cust_doc.custom_vat_no = self.vat_no

		cust_doc.insert(ignore_permissions=True)
		frappe.db.commit()
