# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApplyVehiclesMicrodot(Document):
	def on_update(self):
		if self.status == "Used":
			microdot_doc = frappe.get_doc("Vehicles Microdots",self.name)
			microdot_doc.status = "Used"
			microdot_doc.vin_serial_no = self.vin_serial_no

			microdot_doc.save()

			vehicle_doc = frappe.get_doc("Vehicle Stock",self.vin_serial_no)

			if not vehicle_doc.microdot:
				vehicle_doc.microdot = self.name
				vehicle_doc.microdot_fitted_by = self.microdot_fitted_by

				vehicle_doc.save()