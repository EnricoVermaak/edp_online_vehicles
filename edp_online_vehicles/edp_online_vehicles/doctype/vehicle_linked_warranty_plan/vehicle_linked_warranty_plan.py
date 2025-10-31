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

		# -------------------- START: Custom Code for Active Plans --------------------
		# Step 1: Check if current status is Active
		if self.status == "Active":
			# Step 2: Get all active warranty plans
			active_plans = frappe.get_all(
				"Vehicle Linked Warranty Plan",
				filters={"status": "Active"},
				fields=["name", "vin_serial_no"]
			)

			# Step 3: Loop through all active plans
			for plan in active_plans:
				if plan.vin_serial_no:
					# Step 4: Get the linked Vehicle Stock document
					vehicle_stock = frappe.get_doc("Vehicle Stock", plan.vin_serial_no)

					# Step 5: Add a new row in child table
					new_row = vehicle_stock.append("table_pcgj", {})
					new_row.warranty_plan_description = plan.name

					# Step 6: Save the updated Vehicle Stock document
					vehicle_stock.save(ignore_permissions=True)

			frappe.msgprint("All active warranty plans have been added to Vehicle Stock child table.")
		# -------------------- END: Custom Code for Active Plans --------------------
	
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
