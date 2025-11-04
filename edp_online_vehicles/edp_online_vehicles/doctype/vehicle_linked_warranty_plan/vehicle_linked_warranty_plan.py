# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleLinkedWarrantyPlan(Document):
	# Constants
	STATUS_ACTIVE = "Active"
	
	def before_save(self):
		self._update_title()
	
	def _update_title(self):
		# Title field uses fetch_from, but we ensure it's set as a fallback
		if self.warranty_plan:
			self.title = self.warranty_plan
		else:
			self.title = self.name or ""
	
	def get_title(self):
		# This ensures the title is always the warranty plan name for Link field display
		if self.warranty_plan:
			return self.warranty_plan
		return self.name or ""
	
	def after_insert(self):
		self._update_title()
		# Only add to vehicle stock table if status is Active
		if self.status == self.STATUS_ACTIVE:
			self.add_to_vehicle_stock_warranty_table()
	
	def on_update(self):
		if self.has_value_changed("warranty_plan"):
			self._update_title()  # Update title when warranty plan changes
			# Only add to vehicle stock table if status is Active
			if self.status == self.STATUS_ACTIVE:
				self.add_to_vehicle_stock_warranty_table()
		
		if self.has_value_changed("status"):
			self._handle_status_change()
	
	def on_trash(self):
		self.remove_from_vehicle_stock_warranty_table()
	
	def _handle_status_change(self):
		if not self._is_valid_for_vehicle_stock_update():
			return
		
		prev_status = self._get_previous_status()
		
		# When status changes to Active, add to vehicle stock warranty table
		if self._is_becoming_active(prev_status):
			self.add_to_vehicle_stock_warranty_table()
		# When status changes from Active to something else, remove from table
		elif self._is_leaving_active(prev_status):
			self.remove_from_vehicle_stock_warranty_table()
	
	def _get_previous_status(self):
		doc_before_save = self.get_doc_before_save()
		return doc_before_save.status if doc_before_save else None
	
	def _is_becoming_active(self, prev_status):
		return self.status == self.STATUS_ACTIVE and prev_status != self.STATUS_ACTIVE
	
	def _is_leaving_active(self, prev_status):
		return prev_status == self.STATUS_ACTIVE and self.status != self.STATUS_ACTIVE
	
	def _is_valid_for_vehicle_stock_update(self):
		return bool(self.vin_serial_no and self.warranty_plan)
	
	def _get_vehicle_stock(self):
		if not self.vin_serial_no:
			return None
		return frappe.get_doc("Vehicle Stock", self.vin_serial_no)
	
	def _warranty_exists_in_vehicle_stock(self, vehicle_stock):
		return any(
			row.warranty_plan_description == self.name
			for row in vehicle_stock.table_pcgj
			if row.warranty_plan_description
		)
	
	def _save_vehicle_stock(self, vehicle_stock):
		vehicle_stock.save(ignore_permissions=True)
		frappe.db.commit()
	
	def add_to_vehicle_stock_warranty_table(self):
		# Only add if status is Active
		if self.status != self.STATUS_ACTIVE:
			return
		
		if not self._is_valid_for_vehicle_stock_update():
			return
		
		vehicle_stock = self._get_vehicle_stock()
		if not vehicle_stock:
			return
		
		if not self._warranty_exists_in_vehicle_stock(vehicle_stock):
			vehicle_stock.append("table_pcgj", {
				"warranty_plan_description": self.name,  # Store the Vehicle Linked Warranty Plan name
				"period_months": self.warranty_period_months,
				"warranty_odo_limit": self.warranty_limit_km_hours
			})
			self._save_vehicle_stock(vehicle_stock)
	
	def remove_from_vehicle_stock_warranty_table(self):
		if not self._is_valid_for_vehicle_stock_update():
			return
		
		vehicle_stock = self._get_vehicle_stock()
		if not vehicle_stock:
			return
		
		vehicle_stock.table_pcgj = [
			row for row in vehicle_stock.table_pcgj
			if row.warranty_plan_description != self.name
		]
		
		self._save_vehicle_stock(vehicle_stock)
