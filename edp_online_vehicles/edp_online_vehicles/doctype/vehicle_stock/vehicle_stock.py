# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_years, add_months


class VehicleStock(Document):
	def validate(self):
		
		if self.warranty_period_years and self.warranty_start_date:
			# Convert the period to months for calculation (field is named years but contains months)
			self.warranty_end_date = add_months(self.warranty_start_date, int(self.warranty_period_years))
			
		if self.service_period_years and self.service_start_date:
			# Convert the period to months for calculation (field is named years but contains months)
			self.service_end_date = add_months(self.service_start_date, int(self.service_period_years))

	def before_insert(self):
		if self.type == "Used":
			setting_doc = frappe.get_doc("Vehicle Stock Settings")

			if setting_doc.automatically_create_stock_no_for_used_vehicles:
				stockNo = setting_doc.used_vehicles_last_stock_no

				newStockNo = self.increment_stock_number(stockNo)

				self.stock_no = newStockNo

				setting_doc.used_vehicles_last_stock_no = newStockNo
				setting_doc.save(ignore_permissions=True)
				frappe.db.commit()

	def before_save(self):
		for row in self.attached_documents:
			file_url = row.document

			if file_url:
				existing_file = frappe.db.exists(
					{
						"doctype": "File",
						"file_url": file_url,
						"attached_to_doctype": self.doctype,
						"attached_to_name": self.name,
					}
				)
				if not existing_file:
					file_doc = frappe.get_doc(
						{
							"doctype": "File",
							"file_url": file_url,
							"attached_to_doctype": self.doctype,
							"attached_to_name": self.name,
						}
					)
					file_doc.insert(ignore_permissions=True)
					frappe.db.commit()
					# frappe.msgprint(f"File {file_url} attached successfully.")

	def after_insert(self):
		if not self.shipment_id:
			self.create_stock_entry()

			# if serial_no_create == "Confirm":
			# 	# frappe.msgprint("Vehicle successfully created")
			# else:
			# 	# frappe.msgprint("Serial No not registered. Please contact support.")

	def create_stock_entry(self):
		self.create_or_update_items()
		serial_confirm = self.create_stock_entry_for_serial_numbers()
		cust_confirm = self.create_customer_for_stock()
		frappe.db.commit()
		if serial_confirm == "Confirm" and cust_confirm == "Confirm":
			return "Confirm"

	def create_or_update_items(self):
		item_name = frappe.utils.get_link_to_form("Model Administration", self.model)

		if not frappe.db.exists("Item", self.model):
			frappe.throw(f"{item_name} Item does not Exist")

	def create_stock_entry_for_serial_numbers(self):
		stock_entry = frappe.get_doc(
			{
				"doctype": "Stock Entry",
				"stock_entry_type": "Material Receipt",
				"company": self.dealer,
				"items": [],
			}
		)

		if not self.vin_serial_no:
			frappe.throw(_("Serial No is missing for item"))

		if not self.model:
			frappe.throw(_("Model code is missing for an item."))

		com_doc = frappe.get_doc("Company", self.dealer)

		if not com_doc.custom_default_vehicles_stock_warehouse:
			com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
			com_doc.save()

		stock_entry.append(
			"items",
			{
				"item_code": self.model,
				"qty": 1,
				"basic_rate": 0,
				"serial_no": self.vin_serial_no,
				"t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
				"allow_zero_valuation_rate": 1,
			},
		)
		# else:
		# 	stock_entry.append('items', {
		# 		'item_code': self.model,
		# 		'qty': 1,
		# 		'basic_rate': self.cost_price_excl,
		# 		'serial_no': self.vin_serial_no,
		# 		't_warehouse': com_doc.custom_default_vehicles_stock_warehouse
		# 	})

		stock_entry.save()
		stock_entry.submit()

		self.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse

		return "Confirm"

	def create_customer_for_stock(self):
		if self.import_customer_name and self.import_customer_surname and self.import_customer_email_address:
			cust_doc = frappe.new_doc("Dealer Customer")

			cust_doc.customer_type = "Individual"
			cust_doc.customer_name = self.import_customer_name
			cust_doc.customer_surname = self.import_customer_surname
			cust_doc.email = self.import_customer_email_address

			cust_doc.check_qvlp = "No"
			cust_doc.would_you_like_to_receive_marketing_updates_via_email = "No"
			cust_doc.would_you_like_to_receive_marketing_updates_via_post = "No"
			cust_doc.did_you_confirm_all_popi_regulations_with_your_customer = "Yes"

			cust_doc.insert()

			self.customer = cust_doc.name

			self.save()

			return "Confirm"

	def increment_stock_number(self, stock_number):
		# Split the prefix and number part
		prefix = "".join(filter(str.isalpha, stock_number))
		number = "".join(filter(str.isdigit, stock_number))

		# Increment the numeric part and ensure it is 6 characters long
		incremented_number = str(int(number) + 1).zfill(6)

		# Combine prefix and incremented number
		return prefix + incremented_number
