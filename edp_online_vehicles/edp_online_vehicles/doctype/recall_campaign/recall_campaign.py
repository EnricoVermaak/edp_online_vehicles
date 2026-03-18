# Copyright (c) 2026, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RecallCampaign(Document):
	def _get_plan_description(self):
		return "Recall: {} - {}".format(
			self.name,
			self.campaign_description or "Campaign"
		)

	def _find_plan_name(self):
		desc = self._get_plan_description()
		if frappe.db.exists("Vehicles Warranty Plan Administration", desc):
			return desc
		if frappe.db.exists("Vehicles Warranty Plan Administration", self.name):
			return self.name
		return None

	def after_insert(self):
		description = self._get_plan_description()

		if frappe.db.exists("Vehicles Warranty Plan Administration", description):
			plan_name = description
		else:
			plan = frappe.new_doc("Vehicles Warranty Plan Administration")
			plan.description = description
			plan.status = "Active"
			plan.warranty_period_months = 0
			plan.warranty_odo_limit = 0

			plan_type = frappe.db.exists(
				"Vehicles Warranty Plan Type",
				{"description": "Recall Campaign"}
			)

			if plan_type:
				plan.warranty_type = plan_type
			else:
				new_type = frappe.get_doc({
					"doctype": "Vehicles Warranty Plan Type",
					"name": "Recall Campaign",
					"description": "Recall Campaign",
				})
				new_type.insert(ignore_permissions=True)
				frappe.db.commit()
				plan.warranty_type = new_type.name

			for part in self.recall_campaign_parts or []:
				if part.item:
					plan.append("items", {"item": part.item})

			plan.insert(ignore_permissions=True)
			plan_name = plan.name

		self._create_missing_linked_warranty_plans(plan_name)

	def on_update(self):
		plan_name = self._find_plan_name()
		if plan_name:
			self._create_missing_linked_warranty_plans(plan_name)

		if self.has_value_changed("active"):
			self._sync_connected_warranty_plan_status()

	def _create_missing_linked_warranty_plans(self, plan_name):
		if not plan_name:
			return

		for vehicle in self.recall_campaign_vehicles or []:
			if not vehicle.vin_serial_no:
				continue

			existing_linked_plan = frappe.db.exists(
				"Vehicle Linked Warranty Plan",
				{
					"vin_serial_no": vehicle.vin_serial_no,
					"warranty_plan": plan_name,
				},
			)

			if existing_linked_plan:
				continue

			frappe.get_doc(
				{
					"doctype": "Vehicle Linked Warranty Plan",
					"vin_serial_no": vehicle.vin_serial_no,
					"warranty_plan": plan_name,
					"status": "Active",
				}
			).insert(ignore_permissions=True)

	def _sync_connected_warranty_plan_status(self):
		plan_name = self._find_plan_name()
		if not plan_name:
			return

		status = "Active" if self.active else "Inactive"
		frappe.db.set_value(
			"Vehicles Warranty Plan Administration",
			plan_name,
			"status",
			status,
		)
