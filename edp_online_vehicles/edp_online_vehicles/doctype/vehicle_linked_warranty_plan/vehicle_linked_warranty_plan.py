# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleLinkedWarrantyPlan(Document):
	def after_insert(self):
		self.add_to_vehicle_stock_warranty_table()
	
	def on_update(self):
		if self.has_value_changed("warranty_plan"):

			self.add_to_vehicle_stock_warranty_table()
	
	def on_trash(self):
		self.remove_from_vehicle_stock_warranty_table()
	
	def add_to_vehicle_stock_warranty_table(self):
		if not self.vin_serial_no or not self.warranty_plan:
			return
		
		vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		
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
		if not self.vin_serial_no or not self.warranty_plan:
			return
		
		vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		
		vehicle_stock.table_pcgj = [
			row for row in vehicle_stock.table_pcgj
			if row.warranty_plan_description != self.warranty_plan
		]
		
		vehicle_stock.save(ignore_permissions=True)
		frappe.db.commit()
