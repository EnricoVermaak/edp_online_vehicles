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
			if frappe.db.exists("Customer", {"custom_customer_code": self.id_no}):
				cust_name = frappe.db.get_value("Customer", {"custom_customer_code": self.id_no}, "name")
				if cust_name:
					cust_doc = frappe.get_doc("Customer", cust_name)
					updated = False

				if cust_doc:
					if self.customer_full_name:
						cust_doc.customer_name = self.customer_full_name

					if self.address:
						cust_doc.primary_address = self.address

					if self.mobile and self.mobile != cust_doc.mobile_no:
						cust_doc.mobile_no = self.mobile
						updated = True

					if self.email and self.email != cust_doc.email_id:
						cust_doc.email_id = self.email
						updated = True

					if self.vat_no:
						cust_doc.custom_vat_no = self.vat_no

					if updated:
						try: 
							cust_doc.save(ignore_permissions=True)
							frappe.log_error(f"Updated Customer {cust_doc.name} with mobile: {self.mobile}, email: {self.email}", "DealerCustomer Update")
						except Exception as e:
							frappe.log_error(f"No Changes to update for customer {cust_doc.name}","DealerCustomer Update")
					else:
						frappe.log_error(f"No changes to update for Customer {cust_doc.name}", "DealerCustomer Update")

		frappe.db.commit()

	def after_insert(self):
		if self.customer_type == "Business" and self.company_reg_no:
			if frappe.db.exists("Customer", {"custom_customer_code": self.company_reg_no}):
				return
		elif self.customer_type != "Business" and self.id_no:
			if frappe.db.exists("Customer", {"custom_customer_code": self.id_no}):
				return
				
		cust_doc = frappe.new_doc("Customer")

		if self.customer_type == "Business":
			cust_doc.custom_customer_code = self.company_reg_no
			cust_doc.customer_name = self.company_name
		else:
			cust_doc.custom_customer_code = self.id_no
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
