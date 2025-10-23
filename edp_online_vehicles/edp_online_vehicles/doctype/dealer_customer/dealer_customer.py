# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DealerCustomer(Document):

	def validate(self):
		if self.customer_type == "Business":
			if frappe.db.exists("Customer", {"custom_customer_code": self.company_reg_no}):
				cust_name = frappe.db.get_value("Customer", {"custom_customer_code": self.company_reg_no}, "name")
				if cust_name:
					self.update_existing_customer(cust_name, "Business")
		else:
			if frappe.db.exists("Customer", {"custom_customer_code": self.id_no}):
				cust_name = frappe.db.get_value("Customer", {"custom_customer_code": self.id_no}, "name")
				if cust_name:
					self.update_existing_customer(cust_name, "Individual/Foreigner")

		frappe.db.commit()

	def update_existing_customer(self, cust_name, customer_type):
		try:
			current_values = frappe.db.get_value("Customer", cust_name, 
				["customer_name", "mobile_no", "email_id", "primary_address", "custom_vat_no"], as_dict=True)
			
			if not current_values:
				frappe.log_error(f"Customer {cust_name} not found", "DealerCustomer Update")
				return
			
			mobile_changed = self.mobile and self.mobile != current_values.mobile_no
			email_changed = self.email and self.email != current_values.email_id
			
			update_fields = {}
			
			if customer_type == "Business":
				if self.company_name and self.company_name != current_values.customer_name:
					update_fields["customer_name"] = self.company_name
			else:
				if self.customer_full_name and self.customer_full_name != current_values.customer_name:
					update_fields["customer_name"] = self.customer_full_name
			
			if self.address and self.address != current_values.primary_address:
				update_fields["primary_address"] = self.address
			
			if mobile_changed:
				update_fields["mobile_no"] = self.mobile
			
			if email_changed:
				update_fields["email_id"] = self.email
			
			if self.vat_no and self.vat_no != current_values.custom_vat_no:
				update_fields["custom_vat_no"] = self.vat_no
			
			if update_fields:
				frappe.db.set_value("Customer", cust_name, update_fields)
			
			if mobile_changed or email_changed:
				self.update_customer_contact_direct(cust_name)
			
			if update_fields or mobile_changed or email_changed:
				self.refresh_customer_html_fields(cust_name)
				
		except Exception as e:
			raise e

	def update_customer_contact_direct(self, cust_name):
		try:
			contact = frappe.get_cached_value("Customer", cust_name, "customer_primary_contact")
			if not contact:
				contact = frappe.db.sql(
					"""
					SELECT parent FROM `tabDynamic Link`
					WHERE
						parenttype = 'Contact' AND
						parentfield = 'links' AND
						link_doctype = 'Customer' AND
						link_name = %s
					""",
					(cust_name),
					as_dict=1,
				)
				contact = contact[0].get("parent") if contact else None

			if not contact:
				customer_name = frappe.db.get_value("Customer", cust_name, "customer_name")
				new_contact = frappe.new_doc("Contact")
				new_contact.is_primary_contact = 1
				new_contact.first_name = customer_name
				new_contact.set("links", [{"link_doctype": "Customer", "link_name": cust_name}])
				new_contact.save()
				contact = new_contact.name
				frappe.db.set_value("Customer", cust_name, "customer_primary_contact", contact)

			contact_update_fields = {}
			if self.email:
				contact_update_fields["email_id"] = self.email
			if self.mobile:
				contact_update_fields["mobile_no"] = self.mobile
			
			if contact_update_fields:
				frappe.db.set_value("Contact", contact, contact_update_fields)

			if self.email:
				frappe.db.sql("DELETE FROM `tabContact Email` WHERE parent = %s", (contact,))
				frappe.db.sql("""
					INSERT INTO `tabContact Email` (name, parent, parentfield, parenttype, email_id, is_primary)
					VALUES (%s, %s, 'email_ids', 'Contact', %s, 1)
				""", (frappe.generate_hash(), contact, self.email))
			
			if self.mobile:
				frappe.db.sql("DELETE FROM `tabContact Phone` WHERE parent = %s", (contact,))
				frappe.db.sql("""
					INSERT INTO `tabContact Phone` (name, parent, parentfield, parenttype, phone, is_primary_mobile_no)
					VALUES (%s, %s, 'phone_nos', 'Contact', %s, 1)
				""", (frappe.generate_hash(), contact, self.mobile))
			
		except Exception as e:
			raise e

	def refresh_customer_html_fields(self, cust_name):
		"""Refresh HTML fields in Customer doctype"""
		try:
			cust_doc = frappe.get_doc("Customer", cust_name)
			cust_doc.run_method("on_update")
		except Exception:
			pass

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
		self.update_customer_contact_direct(cust_doc.name)
		frappe.db.commit()
