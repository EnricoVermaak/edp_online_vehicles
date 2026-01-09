# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form
import re  # For extracting numbers


class VehicleServiceBooking(Document):
	pass


@frappe.whitelist()
def create_service_from_booking(booking_name):
	"""
	Create Vehicle Service from Booking
	Add tag if Odo Reading is missing
	"""

	try:
		# 🔹 Get booking document
		booking = frappe.get_doc("Vehicle Service Booking", booking_name)

		# 🔍 Check if service already exists for this booking
		existing_service = frappe.db.get_value(
			"Vehicles Service",
			{"booking_name": booking.name},
			"name"
		)

		# 🟢 IF SERVICE ALREADY EXISTS
		if existing_service:
			service = frappe.get_doc("Vehicles Service", existing_service)

			if getattr(booking, "odo_reading_hours", None):
				service.db_set("odo_reading_hours", booking.odo_reading_hours)
				service.remove_tag("Odo Reading Missing")

			return service.name


		# 🔵 CREATE NEW SERVICE
		service = frappe.get_doc({
			"doctype": "Vehicles Service",
			"requested_booking_date_time": booking.requested_booking_date_time,
			"dealer": booking.dealer,
			"service_type": booking.service_type,
			"service_status": booking.status,
			"vin_serial_no": booking.vin_serial_no,
			"model": booking.model,
			"engine_no": booking.engine_no,
			"odo_reading_hours": getattr(booking, "odo_reading_hours", None),
			"customer": booking.customer,
			"customer_name": booking.customer_full_name,
			"mobile": booking.mobile,
			"terms_and_conditions": booking.service_notes,
			"booking_name": booking.name  # Always set booking reference
		})

		# 🔹 Auto-generate Job Card Number if not provided
		booking_job_card_no = getattr(booking, "job_card_no", None)
		if not booking_job_card_no:
			settings = frappe.get_doc("Vehicle Service Settings")
			if settings.allow_auto_job_card_no:
				last_job_no = settings.last_auto_job_card_no or "000000"
				prefix = settings.auto_job_card_no_prefix or ""

				# Extract number part
				match = re.search(r'\d+', last_job_no)
				number = int(match.group(0)) if match else 0

				# Increment and pad
				incremented_number = str(number + 1).zfill(6)
				next_job_no = prefix + incremented_number

				service.job_card_no = next_job_no

				# Update settings last number
				settings.last_auto_job_card_no = next_job_no
				settings.save(ignore_permissions=True)
		else:
			service.job_card_no = booking_job_card_no
		for row in booking.table_jwkk:
			service.append("service_parts_items", {
				"item": row.item,
				"description": row.description,
				"qty": row.qty,
				"price_excl": row.price_excl,
				"total_excl": row.total_excl,
				"non_oem":row.non_oem,
				"descrip":row.descrip,

			})	
		for row in booking.table_ottr:
			service.append("service_labour_items", {
				"item": row.item,
				"description": row.description,
				"duration_hours": row.duration_hours,
				"rate_hour": row.rate_hour,
				"total_excl": row.total_excl,
				"non_oem":row.non_oem,
				"non_oem_description":row.non_oem_description,
				
				
			})	
		# 🔵 Insert new service
		service.insert(ignore_permissions=True)

		# 🔴 Add tag if ODO reading is missing
		if not getattr(booking, "odo_reading_hours", None):
			service.add_tag("Odo Reading Missing")

		# 🔗 Link to form message
		link = get_link_to_form("Vehicles Service", service.name)
		frappe.msgprint(
			f"✅ Vehicle Service created: {link}",
			title="Success"
		)

		return service.name

	except Exception as e:
		# Log full traceback for debugging
		frappe.log_error(frappe.get_traceback(), "Create Service From Booking Error")
		frappe.throw(f"Error while creating Vehicle Service: {str(e)}")
