# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form


class VehicleServiceBooking(Document):
	pass


@frappe.whitelist()
def create_service_from_booking(booking_name):
	"""
	Create Vehicle Service from Booking
	Add tag if Odo Reading is missing
	"""

	try:
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
			if booking.odo_reading_hours:
				service.odo_reading_hours = booking.odo_reading_hours
				service.remove_tag("Odo Reading Missing")
				service.save(ignore_permissions=True)

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
			"odo_reading_hours": booking.odo_reading_hours,
			"customer": booking.customer,
			"customer_name": booking.customer_full_name,
			"mobile": booking.mobile,
			"terms_and_conditions": booking.service_notes,
			"job_card_no": "a122", 
			 "booking_name":booking.name # Placeholder, to be updated later
		})

		service.insert(ignore_permissions=True)

		# 🔴 ADD TAG IF ODO IS MISSING
		if not booking.odo_reading_hours:
			service.add_tag("Odo Reading Missing")

		link = get_link_to_form("Vehicles Service", service.name)

		frappe.msgprint(
			f"✅ Vehicle Service created: {link}",
			title="Success"
		)

		return service.name

	except Exception:
		frappe.log_error(frappe.get_traceback(), "Create Service From Booking Error")
		frappe.throw("Error while creating Vehicle Service")
