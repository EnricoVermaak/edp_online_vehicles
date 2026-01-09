# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, add_months


class VehicleLinkedServicePlan(Document):

    def validate(self):
        # ---- Date Set Logic ----
        activation_date = now_datetime()
        months = self.service_period_limit_months or 0
        expiration_date = add_months(activation_date, months)

        # Set values in fields
        self.activation_date_time = activation_date
        self.expiration_date_time = expiration_date

    def on_update(self):
        if self.status == "Active":
            if frappe.db.exists("Vehicle Stock", self.vin__serial_no):
                vehicle_stock = frappe.get_doc("Vehicle Stock", self.vin__serial_no)
                vehicle_stock.append("table_gtny", {
                    "service_plan_no": self.name,
                    "period_months": self.service_period_limit_months,
                    "odo_limit": self.service_km_hours_limit
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