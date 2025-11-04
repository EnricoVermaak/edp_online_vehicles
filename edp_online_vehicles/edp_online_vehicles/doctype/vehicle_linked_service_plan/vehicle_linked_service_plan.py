# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleLinkedServicePlan(Document):
	def on_update(self):
		if self.status == "Active":
			if frappe.db.exists("Vehicle Stock", self.vin__serial_no):
				vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin__serial_no)
				vehicle_stock.append("table_gtny", {
					"service_plan_description": self.name
				})
				vehicle_stock.save(ignore_permissions=True)

			# active_plans = frappe.get_all(
			# 	"Vehicle Linked Service Plan",
			# 	filters={"status": "Active"},
			# 	fields=["name", "vin__serial_no"]
			# )

			# for plan in active_plans:
			# 	if plan.vin__serial_no:

			# 			new_row = vehicle_stock.append("table_gtny", {})
			# 			new_row.service_plan_description = plan.name


			# frappe.msgprint("All active service plans have been added to Vehicle Stock child table.")