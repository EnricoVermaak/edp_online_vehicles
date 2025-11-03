# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_years, add_months, today


class VehicleStock(Document):
	def validate(self):
 
		self.service_period_years = sum([row.period_months or 0 for row in self.table_gtny])

		self.service_km_hours_limit = max([row.odo_limit or 0 for row in self.table_gtny], default=0)

		if self.availability_status == "Sold" and not self.service_start_date:
			self.service_start_date = frappe.utils.today()
			self.service_end_date = add_months(self.service_start_date, self.service_period_years or 0)

		self.update_warranty_period()
		self.update_warranty_km_hours_limit()
		self.sort_warranty_plans_by_creation()
		
		if self.warranty_period_years and self.warranty_start_date:
			# Convert the period to months for calculation
			self.warranty_end_date = add_months(self.warranty_start_date, int(self.warranty_period_years))
			
		if self.service_period_years and self.service_start_date:
			# Convert the period to months for calculation
			self.service_end_date = add_months(self.service_start_date, int(self.service_period_years))
	
		# linked_plans = frappe.get_all("Vehicle Linked Service Plan", filters={"vin_serial_no": self.name}, pluck="name")
		# for plan_name in linked_plans:
		# 	plan = frappe.get_doc("Vehicle Linked Service Plan",plan_name)
		# 	if self.availability_status == "Sold":
		# 		plan.status = "Active"
		# 	elif self.availability_status == "Available":
		# 		plan.status = "Pending Activation"
		# 	plan.save(ignore_permissions=True)	


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

	def update_warranty_period(self):
		if hasattr(self, 'table_pcgj') and self.table_pcgj:
			total_months = 0
			for plan in self.table_pcgj:
				if plan.period_months:
					total_months += int(plan.period_months)
			self.warranty_period_years = total_months
		else:
			self.warranty_period_years = 0

	def sort_warranty_plans_by_creation(self):
		if hasattr(self, 'table_pcgj') and self.table_pcgj:
			# Sort by creation date of linked Warranty Plan Administration
			def get_creation_time(plan):
				try:
					if plan.warranty_plan_description:
						if frappe.db.exists("Vehicle Linked Warranty Plan", plan.warranty_plan_description):
							linked_plan = frappe.db.get_value(
								"Vehicle Linked Warranty Plan",
								plan.warranty_plan_description,
								["warranty_plan", "creation"],
								as_dict=True
							)
							
							if linked_plan and linked_plan.get("warranty_plan"):
								creation_value = frappe.db.get_value(
									"Vehicles Warranty Plan Administration",
									linked_plan.warranty_plan,
									"creation"
								)
								if creation_value:
									return frappe.utils.get_datetime(creation_value)
							
							if linked_plan and linked_plan.get("creation"):
								return frappe.utils.get_datetime(linked_plan.creation)
						
						elif frappe.db.exists("Vehicles Warranty Plan Administration", plan.warranty_plan_description):
							creation_value = frappe.db.get_value(
								"Vehicles Warranty Plan Administration",
								plan.warranty_plan_description,
								"creation"
							)
							if creation_value:
								return frappe.utils.get_datetime(creation_value)
				except Exception:
					pass
				
				return frappe.utils.now()
			
			self.table_pcgj.sort(key=lambda x: (get_creation_time(x), x.idx or 999))
			
			# Update idx to reflect the sorted order
			for idx, plan in enumerate(self.table_pcgj, start=1):
				plan.idx = idx

	def update_warranty_km_hours_limit(self):
		if hasattr(self, 'table_pcgj') and self.table_pcgj:
			max_odo_limit = 0
			
			for warranty_plan in self.table_pcgj:
				if warranty_plan.warranty_odo_limit and warranty_plan.warranty_odo_limit > max_odo_limit:
					max_odo_limit = warranty_plan.warranty_odo_limit
			
			self.warranty_km_hours_limit = int(max_odo_limit) if max_odo_limit > 0 else None

	def increment_stock_number(self, stock_number):
		# Split the prefix and number part
		prefix = "".join(filter(str.isalpha, stock_number))
		number = "".join(filter(str.isdigit, stock_number))

		# Increment the numeric part and ensure it is 6 characters long
		incremented_number = str(int(number) + 1).zfill(6)

		# Combine prefix and incremented number
		return prefix + incremented_number
