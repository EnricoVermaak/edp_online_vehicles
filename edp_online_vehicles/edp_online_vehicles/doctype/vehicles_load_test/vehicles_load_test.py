# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class VehiclesLoadTest(Document):
	def validate(self):
		if float(self.load_test_at) < float(self.required_load_test_pass_rate):
			self.status = "Fail"
		else:
			self.status = "Pass"

	def on_submit(self):
		doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
		previous_hours = doc.current_hours
		doc.current_hours = self.hour_meter
		doc.last_load_test_date = self.tested_on
		doc.next_load_test_date = self.next_load_test
		self_reference = frappe.utils.get_link_to_form(self.doctype, self.name)
		msg = f"Odo Reading updated by Load Test {self_reference} done on {self.tested_on} from {previous_hours} to {doc.current_hours}"
		doc.add_comment("Comment", msg)
		doc.save()
		frappe.db.commit()

	def on_update(self):
		doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)

		if doc.current_location != self.current_location or doc.customer != self.customer:
			new_doc = frappe.new_doc("Vehicles Location Movement")
			new_doc.prev_location = doc.current_location
			new_doc.new_location = self.current_location
			new_doc.prev_customer = doc.customer
			new_doc.new_customer = self.customer
			new_doc.reference_doctype = self.doctype
			new_doc.reference_name = self.name
			new_doc.date_of_request = self.creation
			new_doc.vinserial_no = doc.name

			auto_allow = frappe.db.get_single_value(
				"Vehicle Stock Settings", "automatically_approve_vehicles_location_movement"
			)

			if auto_allow:
				new_doc.status = "Approved"
				new_doc.insert()
			else:
				new_doc.insert()


@frappe.whitelist()
def create_internal_docs_notes(source_name, target_doc=None):
	doc = get_mapped_doc(
		"Vehicles Load Test",
		source_name,
		{
			"Vehicles Load Test": {
				"doctype": "Internal Docs and Notes",
				"field_map": {"name": "load_test"},
			},
		},
		target_doc,
	)

	return doc
