# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ModelConversion(Document):
	def on_save(self):
		if hasattr(self, 'table_fgif') and self.table_fgif and self.status == "Approved":
			for vehicle_item in self.table_fgif:
				if vehicle_item.vehicle:
					frappe.db.set_value("Vehicle Stock", vehicle_item.vehicle, "model_conversion_date", self.conversion_date, update_modified=False)
					frappe.logger().info(f"Set model conversion date for VIN {vehicle_item.vehicle}: {self.conversion_date}")
