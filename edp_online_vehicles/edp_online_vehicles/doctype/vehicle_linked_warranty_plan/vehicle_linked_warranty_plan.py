# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleLinkedWarrantyPlan(Document):
	def after_insert(self):
		"""Add the warranty plan to the Vehicle Stock's warranty table"""
		self.add_to_vehicle_stock_warranty_table()
	
	def on_update(self):
		"""Update Vehicle Stock warranty table if warranty plan changed"""
		if self.has_value_changed("warranty_plan"):
			# If warranty plan changed, we need to update both old and new records
			# This is handled by the add_to_vehicle_stock_warranty_table method
			self.add_to_vehicle_stock_warranty_table()
	
	def on_trash(self):
		"""Remove the warranty plan from Vehicle Stock's warranty table"""
		self.remove_from_vehicle_stock_warranty_table()
	
	def add_to_vehicle_stock_warranty_table(self):
		"""Add warranty plan to Vehicle Stock's table_pcgj"""
		if not self.vin_serial_no or not self.warranty_plan:
			return
		
		vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		
		# Check if warranty plan already exists in the table
		warranty_exists = any(
			row.warranty_plan_description == self.warranty_plan
			for row in vehicle_stock.table_pcgj
		)
		
		if not warranty_exists:
			vehicle_stock.append("table_pcgj", {
				"warranty_plan_description": self.warranty_plan
			})
			vehicle_stock.save(ignore_permissions=True)
			frappe.db.commit()
	
	def remove_from_vehicle_stock_warranty_table(self):
		"""Remove warranty plan from Vehicle Stock's table_pcgj"""
		if not self.vin_serial_no or not self.warranty_plan:
			return
		
		vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		
		# Remove matching warranty plan from table
		vehicle_stock.table_pcgj = [
			row for row in vehicle_stock.table_pcgj
			if row.warranty_plan_description != self.warranty_plan
		]
		
		vehicle_stock.save(ignore_permissions=True)
		frappe.db.commit()
