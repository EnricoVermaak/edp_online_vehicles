# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class RequestforService(Document):
	def validate(self):
		if self.rfs_status == "In Progress":
			self.rfs_status = "In Progress"
			return
		elif self.rfs_status == "Cancelled":
			self.rfs_status = "Cancelled"
			return
		elif self.rfs_status == "Completed":
			self.rfs_status = "Completed"
			return
		elif self.rfs_status == "Paid":
			self.rfs_status = "Paid"
			return
		elif self.rfs_status == "Rejected":
			self.rfs_status = "Rejected"
			return
		else:
			if self.quote_date and self.quote_no and self.quotation_document:
				self.rfs_status = "Awaiting Quote Approval"

			if self.customer == "63101610" or self.customer == "63100654":
				if self.quote_preapproval_date and self.fianl_approval_signature_date:
					self.rfs_status = "Quote Approved"
			else:
				if (
					self.quote_preapproval_date
					and self.fianl_approval_signature_date
					and self.quote_preapproval_user
					and self.final_approval_user
					and self.quote_preapproval_signature
					and self.final_approval_signature
				):
					self.rfs_status = "Quote Approved"

			if self.invoice_date and self.invoice_no and self.invoice_document:
				self.rfs_status = "Invoiced"

			if self.customer == "63101610" or self.customer == "63100654":
				if self.invoice_approval_date:
					self.rfs_status = "Invoice Approved"
			else:
				if (
					self.invoice_approval_no
					and self.invoice_approval_date
					and self.invoice_approval_user
					and self.invoice_approval_signature
				):
					self.rfs_status = "Invoice Approved"

	def on_submit(self):
		doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no, ignore_permissions=True)
		previous_hours = doc.current_hours
		doc.current_hours = self.odo_reading
		self_reference = frappe.utils.get_link_to_form(self.doctype, self.name)
		msg = f"Odo Reading updated by Request for Service {self_reference} done on {self.request_for_service_date} from {previous_hours} to {doc.current_hours}"
		doc.add_comment("Comment", msg)
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	def on_update(self):
		doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no, ignore_permissions=True)

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
				new_doc.insert(ignore_permissions=True)
			else:
				new_doc.insert(ignore_permissions=True)


@frappe.whitelist()
def create_internal_docs_notes(source_name, target_doc=None):
	doc = get_mapped_doc(
		"Request for Service",
		source_name,
		{
			"Request for Service": {
				"doctype": "Internal Docs and Notes",
				"field_map": {"name": "request_for_service"},
			},
		},
		target_doc,
	)

	return doc
