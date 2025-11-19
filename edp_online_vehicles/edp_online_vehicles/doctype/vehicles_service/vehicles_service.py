# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class VehiclesService(Document):



	def before_save(self):
		for row in self.attach_documents:
			file_url = row.document

			if file_url:
				existing_file = frappe.db.exists(
					{
						"doctype": "File",
						"file_url": file_url,
						"attached_to_doctype": self.doctype,
						"attached_to_name": self.name,
					}
				)
				if not existing_file:
					file_doc = frappe.get_doc(
						{
							"doctype": "File",
							"file_url": file_url,
							"attached_to_doctype": self.doctype,
							"attached_to_name": self.name,
						}
					)
					file_doc.insert(ignore_permissions=True)
					frappe.db.commit()
					# frappe.msgprint(f"File {file_url} attached successfully.")

	def on_submit(self):
		if self.vin_serial_no:
			doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
			doc.current_hours = self.odo_reading_hours
			doc.last_service_hours = self.odo_reading_hours
			doc.last_service_date = self.service_date
			doc.add_comment("Comment", "Odo Reading updated from Service")
			doc.save(ignore_permissions=True)
			frappe.db.commit()

	def on_update(self):
		setting_doc = frappe.get_doc("Vehicle Service Settings")

		setting_doc.last_job_card_no = self.job_card_no

		setting_doc.save(ignore_permissions=True)
		frappe.db.commit()

		# if self.vin_serial_no:
		# doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)

		# if 	doc.customer != self.customer:
		# 	new_doc=frappe.new_doc('Vehicles Location Movement')
		# 	# new_doc.prev_location = doc.current_location
		# 	# new_doc.new_location = self.current_location
		# 	new_doc.prev_customer = doc.customer
		# 	new_doc.new_customer = self.customer
		# 	new_doc.reference_doctype = self.doctype
		# 	new_doc.reference_name = self.name
		# 	new_doc.date_of_request = self.creation
		# 	new_doc.vin_serial_no= doc.name

		# 	auto_allow = frappe.db.get_single_value('Vehicle Stock Settings', 'automatically_approve_vehicles_location_movement')

		# 	if auto_allow:
		# 		new_doc.status = "Approved"
		# 		new_doc.insert(ignore_permissions=True)
		# 	else:
		# 		new_doc.insert(ignore_permissions=True)

	def before_insert(self):
		service_docs = frappe.get_all(
			"Vehicles Service",
			filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
			fields=["name", "service_type", "odo_reading_hours", "service_status", "service_date"],
			order_by="service_date desc",
		)
		for doc in service_docs:
			self.append(
				"service_history",
				{
					"document_no": doc.name,
					"service_type": doc.service_type,
					"odo_readinghours": doc.odo_reading_hours,
					"status": doc.service_status,
					"service_date": doc.service_date,
				},
			)

		warranty_docs = frappe.get_all(
			"Vehicles Warranty Claims",
			filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
			fields=["name", "odo_reading", "date_of_failure", "status", "summary"],
			order_by="date_of_failure desc",
		)
		for doc in warranty_docs:
			self.append(
				"warranty_history",
				{
					"document_no": doc.name,
					"odo_readinghours": doc.odo_reading,
					"date_of_failure": doc.date_of_failure,
					"status": doc.status,
					"summary": doc.summary,
				},
			)

		breakdown_docs = frappe.get_all(
			"Vehicles Breakdown",
			filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
			fields=["name", "odo_reading", "breakdown_reason", "status", "breakdown_date_time"],
			order_by="breakdown_date_time desc",
		)
		for doc in breakdown_docs:
			self.append(
				"breakdown_history",
				{
					"document_no": doc.name,
					"odo_readinghours": doc.odo_reading,
					"breakdown_reason": doc.breakdown_reason,
					"status": doc.status,
					"breakdown_datetime": doc.breakdown_date_time,
				},
			)

		incidents_docs = frappe.get_all(
			"Vehicles Incidents",
			filters={"model_code": self.model, "vin_serial_no": self.vin_serial_no},
			fields=[
				"name",
				"location",
				"odo_reading_hours",
				"status",
				"incident_date_time",
				"incident_type",
				"incident_description",
			],
			order_by="incident_date_time desc",
		)
		for doc in incidents_docs:
			self.append(
				"incident_history",
				{
					"document_no": doc.name,
					"location": doc.location,
					"odo_readinghours": doc.odo_reading_hours,
					"status": doc.status,
					"incident_datetime": doc.incident_date_time,
					"incident_type": doc.incident_type,
					"incident_description": doc.incident_description,
				},
			)


@frappe.whitelist()
def create_internal_docs_notes(source_name, target_doc=None):
	doc = get_mapped_doc(
		"Vehicles Service",
		source_name,
		{
			"Vehicles Service": {
				"doctype": "Internal Docs and Notes",
				"field_map": {"name": "service"},
			},
		},
		target_doc,
	)

	return doc
