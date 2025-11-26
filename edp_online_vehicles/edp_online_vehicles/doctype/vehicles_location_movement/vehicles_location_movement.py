# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime
from frappe.utils import today


class VehiclesLocationMovement(Document):
	def validate(self):
		if self.status == "Approved":
			doc = frappe.get_doc("Vehicle Stock", self.vinserial_no, ignore_permissions=True)
			
			# Handle warehouse transfer
			if self.prev_warehouse and self.move_to_warehouse:
				# Validate warehouses exist
				if not frappe.db.exists('Warehouse', self.move_to_warehouse):
					frappe.throw(f"Destination warehouse '{self.move_to_warehouse}' does not exist.")
				if not frappe.db.exists('Warehouse', self.prev_warehouse):
					frappe.throw(f"Source warehouse '{self.prev_warehouse}' does not exist.")
				
				to_warehouse_doc = frappe.get_doc('Warehouse', self.move_to_warehouse)
				from_warehouse_doc = frappe.get_doc('Warehouse', self.prev_warehouse)

				# Validate model exists
				if not doc.model:
					frappe.throw(f"Model is missing for Vehicle Stock {doc.name}.")
				if not frappe.db.exists('Model Administration', doc.model):
					frappe.throw(f"Model Administration '{doc.model}' does not exist.")
				
				com_doc = frappe.get_doc('Company', to_warehouse_doc.company)
				model_doc = frappe.get_doc('Model Administration', doc.model)

				# Get basic rate, default to 0 if not set
				basic_rate = model_doc.dealer_billing_excl or 0

				# Create Material Issue Stock Entry
				new_issue = frappe.new_doc('Stock Entry')
				new_issue.stock_entry_type = "Material Issue"
				new_issue.company = doc.dealer
				new_issue.append('items', {
					's_warehouse': doc.target_warehouse,
					'item_code': doc.model,
					'qty': 1,
					'uom': "Unit",
					'stock_uom': "Unit",
					'basic_rate': basic_rate,
					'use_serial_batch_fields': 1,
					'serial_no': doc.name,
					'allow_zero_valuation_rate': 1
				})
				new_issue.insert(ignore_permissions=True)
				new_issue.submit()

				# Create Material Receipt Stock Entry
				new_receipt = frappe.new_doc('Stock Entry')
				new_receipt.stock_entry_type = "Material Receipt"
				new_receipt.company = to_warehouse_doc.company
				new_receipt.append('items', {
					't_warehouse': self.move_to_warehouse,
					'item_code': doc.model,
					'qty': 1,
					'uom': "Unit",
					'stock_uom': "Unit",
					'basic_rate': basic_rate,
					'use_serial_batch_fields': 1,
					'serial_no': doc.name,
					'allow_zero_valuation_rate': 1
				})
				new_receipt.insert(ignore_permissions=True)
				new_receipt.submit()

				# Update Vehicle Stock document
				doc.dealer = to_warehouse_doc.company
				doc.target_warehouse = self.move_to_warehouse

				if self.new_customer:
					doc.customer = self.new_customer
				
				doc.availability_status = "Available"
				doc.save(ignore_permissions=True)

				# Create Vehicle Tracking document
				now = datetime.now()
				user = frappe.get_value('User', frappe.session.user, 'full_name') or frappe.session.user

				new_tracking_doc = frappe.new_doc("Vehicle Tracking")
				tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

				new_tracking_doc.vin_serial_no = doc.name
				new_tracking_doc.action_summary = "Vehicle moved to New Warehouse"
				new_tracking_doc.request_datetime = tracking_date_time
				new_tracking_doc.request = f"VIN/Serial No {doc.name} has been moved to Warehouse {self.move_to_warehouse} by user {user}"
				new_tracking_doc.status = "Processed"
				new_tracking_doc.type = "EDP Online"
				
				new_tracking_doc.insert(ignore_permissions=True)

			# Handle customer and location updates (existing logic)
			if self.new_customer:
				doc.customer = self.new_customer

			if self.new_location:
				doc.current_location = self.new_location

			# Only save if we haven't already saved above (for warehouse transfer)
			if not (self.prev_warehouse and self.move_to_warehouse):
				doc.save(ignore_permissions=True)
