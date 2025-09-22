# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document


class VehiclesServiceInspection(Document):
	def on_submit(self):
		doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		previous_hours = doc.current_hours
		doc.current_hours = self.odo_reading
		self_reference = frappe.utils.get_link_to_form(self.doctype, self.name)
		msg = f"Odo Reading updated by vehicles Service Inspection {self_reference} done on {self.inspection_date} from {previous_hours} to {doc.current_hours}"
		doc.add_comment("Comment", msg)
		doc.save()
		frappe.db.commit()
