# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import getdate, add_months, add_days, date_diff, flt
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from edp_online_vehicles.events.send_email import send_custom_email_from_template


class VehiclesService(Document):

	# def validate(self):
	#     self._set_system_status_from_odo_range()
	#     self._enforce_odo_range_block()

	def on_update(self):
		if not self.odo_reading_hours or self.odo_reading_hours == 0:
			self.add_tag("Odo Reading Missing")
		else:
			self.remove_tag("Odo Reading Missing")

		self.sync_to_history()
		self._sync_booking_status_from_mapping()
		setting_doc = frappe.get_doc("Vehicle Service Settings")
		setting_doc.last_job_card_no = self.job_card_no
		setting_doc.save(ignore_permissions=True)
		frappe.db.commit()

		if self.has_value_changed("service_status"):
			status_record = frappe.get_doc("Service Status", self.service_status)
			if status_record.email_template:
				self.send_hq_service_notification(template = status_record.email_template)
			else:
				pass
		self.update_vehicle_status()

		self.check_and_auto_submit()

	def update_vehicle_status(self):
		from edp_online_vehicles.events.change_vehicles_status import service_status_change
		
		if self.vin_serial_no and self.service_status:
			service_status_change(vinno=self.vin_serial_no, status=self.service_status)

	def check_and_auto_submit(self):
		if self.docstatus == 0:
			auto_submit = frappe.db.get_value("Service Status", 
				self.service_status, "automatically_submit_document")
			
			if auto_submit:
				self.flags.ignore_validate_update_after_submit = True
				self.submit()
				frappe.msgprint(f"Document {self.name} has been automatically submitted.")
			
	def _sync_booking_status_from_mapping(self):
		if not self.booking_name or not self.service_status:
			return
		booking_status = frappe.db.get_value(
			"Service Status",
			self.service_status,
			"vehicle_service_booking_status",
		)
		if booking_status:
			frappe.db.set_value(
				"Vehicle Service Booking",
				self.booking_name,
				"status",
				booking_status,
				update_modified=False,
			)
		
	def sync_to_history(self):
		history_name = frappe.db.get_value(
			"Vehicle Service History",
			{"vehicles_service": self.name},
			"name"
		)

		data = self.as_dict()

		ignore_fields = {
			"name", "doctype", "owner", "creation",
			"modified", "modified_by", "idx", "docstatus"
		}
		for field in ignore_fields:
			data.pop(field, None)

		data.pop("service_parts_items", None)
		data.pop("attach_documents", None)
		data.pop("service_labour_items", None)

		if history_name:
			history_doc = frappe.get_doc("Vehicle Service History", history_name)
			history_doc.update(data)
			history_doc.save(ignore_permissions=True)
		else:
			history_doc = frappe.new_doc("Vehicle Service History")
			history_doc.vehicle_service = self.name
			history_doc.update(data)
			history_doc.vehicles_service = self.name
			history_doc.insert(ignore_permissions=True)

	def _set_system_status_from_odo_range(self):
		if not (self.odo_reading_hours and self.service_type and self.model):
			self.system_status = None
			return

		interval = frappe.db.get_value("Service Schedules", self.service_type, "interval") or 0
		try:
			interval = int(str(interval).replace(" ", ""))
		except (TypeError, ValueError):
			self.system_status = None
			return

		model_data = frappe.db.get_value(
			"Model Administration",
			self.model,
			["service_type_max_allowance", "service_type_minimum_allowance"],
			as_dict=True,
		) or {}

		max_allowance = int(model_data.get("service_type_max_allowance") or 0)
		min_allowance = int(model_data.get("service_type_minimum_allowance") or 0)

		min_odo = interval - min_allowance
		max_odo = interval + max_allowance
		odo = int(self.odo_reading_hours or 0)

		if min_odo <= odo <= max_odo:
			self.system_status = "Conditionally Approved"
		else:
			self.system_status = "Conditionally Declined"

	def _enforce_odo_range_block(self):
		# If we don't have the data to calculate, don't block here.
		if not (self.odo_reading_hours and self.service_type and self.model):
			return

		interval = frappe.db.get_value("Service Schedules", self.service_type, "interval") or 0
		try:
			interval = int(str(interval).replace(" ", ""))
		except (TypeError, ValueError):
			return

		model_data = frappe.db.get_value(
			"Model Administration",
			self.model,
			["service_type_max_allowance", "service_type_minimum_allowance"],
			as_dict=True,
		) or {}

		max_allowance = int(model_data.get("service_type_max_allowance") or 0)
		min_allowance = int(model_data.get("service_type_minimum_allowance") or 0)

		min_odo = interval - min_allowance
		max_odo = interval + max_allowance
		odo = int(self.odo_reading_hours or 0)

		if odo < min_odo:
			frappe.throw(
				"Your vehicle hasn't reached its service threshold yet. "
				"Please check back when it meets the minimum mileage requirement."
			)

		if odo > max_odo:
			frappe.throw(
				"Your vehicle's mileage has exceeded the current service range. "
				"Please select the upcoming service schedule to maintain optimal performance."
			)

	def load_schedule_items(self):
		"""Populate labour and parts items from Service Schedule based on service_type."""
		if not self.service_type:
			return

		try:
			schedule_doc = frappe.get_doc("Service Schedules", self.service_type)
		except frappe.DoesNotExistError:
			return

		# Clear existing labour items
		self.service_labour_items = []
		self.non_oem_labour_items = []
		
		# Clear existing parts items
		self.service_parts_items = []
		self.non_oem_parts_items = []

		# Get dealer/company for labour rate
		company = self.dealer or None
		base_labour_rate = 0
		if company:
			base_labour_rate = frappe.db.get_value(
				"Company", 
				company, 
				"custom_service_labour_rate"
			) or 0

		# Load labour items from schedule
		if schedule_doc.service_labour_items:
			for labour in schedule_doc.service_labour_items:
				# Calculate rate with GP
				rate = base_labour_rate
				if labour.item:
					gp_pct = frappe.db.get_value(
						"Item",
						labour.item,
						"custom_service_gp"
					) or 0
					rate = base_labour_rate + (base_labour_rate * gp_pct / 100)

				row = self.append("service_labour_items", {
					"item": labour.item,
					"description": labour.description or "",
					"duration_hours": flt(labour.duration_hours or 1),
					"rate_hour": rate,
					"total_excl": rate * flt(labour.duration_hours or 1),
				})

		# Load parts items from schedule
		if schedule_doc.service_parts_items:
			for part in schedule_doc.service_parts_items:
				row = self.append("service_parts_items", {
					"item": part.item,
					"description": part.description or "",
					"qty": flt(part.qty or 1),
					"price_excl": flt(part.price_excl or 0),
					"total_excl": flt(part.total_excl or 0),
				})

	def before_save(self):
		from edp_api.api.service.file_handler import resolve_file, is_base64

		for row in self.attach_documents:
			file_url = row.document

			if file_url and isinstance(file_url, str):
				# If the client provided a base64 string or data URI, save it as a File first
				if file_url.startswith("data:") or is_base64(file_url):
					try:
						resolved = resolve_file(file_url, "attach_documents", self.name, return_filename=False)
						# If resolve_file returned a tuple (url, name), extract url
						if isinstance(resolved, tuple):
							file_url = resolved[0]
						else:
							file_url = resolved
					except Exception:
						# Fall back to original value; subsequent code will raise a validation error
						pass
				# Normalize full site URLs to relative paths
				from frappe.utils import get_url
				try:
					site = get_url()
					if file_url.startswith(site):
						file_url = file_url[len(site):]
				except Exception:
					pass

				# Ensure leading slash for file paths like 'private/files/..' -> '/private/files/...'
				if (file_url.startswith("files/") or file_url.startswith("private/files/")):
					file_url = "/" + file_url

				# Update the row with normalized value
				row.document = file_url

				# Check for an existing File attached to this document
				existing_file = frappe.db.exists(
					{
						"doctype": "File",
						"file_url": file_url,
						"attached_to_doctype": self.doctype,
						"attached_to_name": self.name,
					}
				)
				if not existing_file:
					# If a File with this file_url exists but is not attached to this doc, attach it instead of inserting a new one
					existing_by_url = frappe.db.get_value("File", {"file_url": file_url}, "name")
					if existing_by_url:
						frappe.db.set_value("File", existing_by_url, {
							"attached_to_doctype": self.doctype,
							"attached_to_name": self.name,
						})
						frappe.db.commit()
					else:
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
		history_name = frappe.db.get_value(
			"Vehicle Service History",
			{"vehicles_service": self.name, "docstatus": 0},
			"name"
		)
		if history_name:
			history_doc = frappe.get_doc("Vehicle Service History", history_name)
			history_doc.submit() 
		
		if self.vin_serial_no:
			doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
			doc.current_hours = self.odo_reading_hours
			doc.last_service_hours = self.odo_reading_hours
			doc.last_service_date = self.service_date
			doc.add_comment("Comment", "Odo Reading updated from Service")
			doc.save(ignore_permissions=True)
			frappe.db.commit()

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

	def after_insert(self):
		if self.job_card_no:
			frappe.db.set_single_value("Vehicle Service Settings","last_auto_job_card_no",self.job_card_no)
			
	def send_hq_service_notification(self, template = None):
		"""Logic for Vehicle Service notifications to Head Office."""
		if not self.service_status:
			return
		status_doc = frappe.get_doc('Service Status', self.service_status)
		
		template_content = template or status_doc.email_template
		if not template_content:
			return
		
		recipients = [row.user for row in status_doc.get("email_recipients", []) if row.user]
		
		if self.owner and self.owner not in recipients:
			recipients.append(self.owner)
			
		
		if recipients:
			context = {
				"vin_serial_no": self.vin_serial_no,
				"model_description": self.model_description,
				"service_type": self.service_type,
				"odo_reading_hours": self.odo_reading_hours,
				"dealer": self.dealer,
				"service_status": self.service_status,
				"job_card_no": self.job_card_no
			}
			send_custom_email_from_template(
				recipients,           
				template_content,             
				context,                  
				'Vehicles Service', 
				self.name                 
			)
			
	def validate(self):
		# Validate odo cannot be lower than Vehicle Stock (unless rollback allowed)
		self._validate_odo_not_lower_than_stock()

		# Enforce system status and service range rules
		self._set_system_status_from_odo_range()
		self._enforce_odo_range_block()

		# Existing allowance/service period checks
		self.check_service_allowance()

	def _validate_odo_not_lower_than_stock(self):
		if not self.vin_serial_no or self.odo_reading_hours in (None, ""):
			return

		try:
			new_odo = float(self.odo_reading_hours)
		except (TypeError, ValueError):
			return

		stock_odo = frappe.db.get_value("Vehicle Stock", self.vin_serial_no, "odo_reading") or 0
		rollback_allowed = False
		try:
			rollback_allowed = bool(frappe.db.get_single_value(
				"Vehicle Service Settings",
				"allow_service_odo_reading_roll_back",
			))
		except Exception:
			rollback_allowed = False

		if new_odo < float(stock_odo) and not rollback_allowed:
			frappe.throw(
				_(f"Odometer reading cannot be lower than Vehicle Stock ODO ({stock_odo}).")
			)
	
	def check_service_allowance(self):
		if not self.vin_serial_no or not self.service_date:
			return

		allowance_days = frappe.db.get_single_value("Vehicle Service Settings", "service_allowance_days") or 0
		
		vehicle_dates = frappe.db.get_value("Vehicle Stock", 
			{"vin_serial_no": self.vin_serial_no},
			["service_start_date", "service_end_date"],
			as_dict=True)

		if vehicle_dates and vehicle_dates.service_end_date:
			cut_off = add_days(vehicle_dates.service_end_date, allowance_days)
			current_service_date = getdate(self.service_date)

			if current_service_date > cut_off:
				overdue_by = date_diff(current_service_date, cut_off)
				
				frappe.throw(
					msg=_("Cannot save: This service is overdue by {0} days. "
						"The service window ended on {1}. With a {2}-day allowance, "
						"the final deadline was {3}.")
					.format(
						overdue_by,
						frappe.format(vehicle_dates.service_end_date, "Date"),
						allowance_days,
						frappe.format(cut_off, "Date")
					),
					title=_("Service Period Expired")
				)
import frappe
from frappe import _

@frappe.whitelist()
def bulk_update_service_status(names, target_status):
	"""
	Updates the status for multiple Vehicles Service records.
	:param names: List of document names (strings)
	:param target_status: The status string to update to
	"""
	# Defensive check: ensure 'names' is a list
	if isinstance(names, str):
		names = frappe.parse_json(names)

	if not names:
		return

	for name in names:
		if frappe.has_permission("Vehicles Service", "write", doc=name):
			try:
				doc = frappe.get_doc("Vehicles Service", name)
				doc.service_status = target_status
				doc.save(ignore_permissions=True)
				
			except Exception as e:
				frappe.log_error(f"Failed to update {name}: {str(e)}", "Bulk Status Update Error")
				continue

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
