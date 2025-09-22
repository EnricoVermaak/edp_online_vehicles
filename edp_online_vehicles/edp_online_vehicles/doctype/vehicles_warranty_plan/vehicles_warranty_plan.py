# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesWarrantyPlan(Document):
	@frappe.whitelist()
	def get_model_vehicles(self, model):
		if model:
			vehicles = frappe.get_all(
				"Vehicle Stock", filters={"model": model}, fields=["name", "model", "colour"]
			)
			return vehicles
