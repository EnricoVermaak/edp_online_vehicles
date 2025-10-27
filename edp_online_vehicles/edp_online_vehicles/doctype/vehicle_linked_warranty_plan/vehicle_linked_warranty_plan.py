# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_months


class VehicleLinkedWarrantyPlan(Document):
	def validate(self):
		if not self.status:
			self.status = "Pending Activation"
	
	def after_insert(self):
		self.sync_to_vehicle_stock()
	
	def on_update(self):
		if self.has_value_changed('status') and self.status == "Active":
			self.update_warranty_dates()
	
	def on_trash(self):
		self.remove_from_vehicle_stock()
	
	def sync_to_vehicle_stock(self):
		if not self.vin_serial_no or not self.warranty_plan_description:
			return
		
		try:
			vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
			
			existing_plan = None
			for plan in vehicle_stock.table_pcgj:
				if plan.warranty_plan_description == self.warranty_plan_description:
					existing_plan = plan
					break
			
			if not existing_plan:
				period_months = frappe.db.get_value(
					"Vehicles Warranty Plan Administration",
					self.warranty_plan_description,
					"warranty_period_months"
				)
				warranty_odo_limit = frappe.db.get_value(
					"Vehicles Warranty Plan Administration",
					self.warranty_plan_description,
					"warranty_odo_limit"
				)
				
				vehicle_stock.append("table_pcgj", {
					"warranty_plan_description": self.warranty_plan_description,
					"period_months": period_months,
					"warranty_odo_limit": warranty_odo_limit
				})
				
				vehicle_stock.save(ignore_permissions=True)
				frappe.db.commit()
		except Exception as e:
			frappe.log_error(f"Error syncing warranty plan to Vehicle Stock: {str(e)}")
	
	def remove_from_vehicle_stock(self):
		if not self.vin_serial_no:
			return
		
		try:
			vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
			
			plans_to_remove = []
			for plan in vehicle_stock.table_pcgj:
				if plan.warranty_plan_description == self.warranty_plan_description:
					plans_to_remove.append(plan)
			
			for plan in plans_to_remove:
				vehicle_stock.remove(plan)
			
			vehicle_stock.save(ignore_permissions=True)
			frappe.db.commit()
		except Exception as e:
			frappe.log_error(f"Error removing warranty plan from Vehicle Stock: {str(e)}")
	
	def update_warranty_dates(self):
		if self.warranty_start_date and self.status == "Active":
			# Get the warranty period from Vehicles Warranty Plan Administration
			period_months = frappe.db.get_value(
				"Vehicles Warranty Plan Administration",
				self.warranty_plan_description,
				"warranty_period_months"
			)
			
			if period_months:
				self.warranty_end_date = add_months(self.warranty_start_date, int(period_months))
				self.save(ignore_permissions=True)
