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
	Create a Vehicle Service document using data from Vehicle Service Booking.
	"""
	try:
		# Get booking document
		booking = frappe.get_doc("Vehicle Service Booking", booking_name)

		# Create a new Vehicle Service document
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
		})

		# Save new document
		service.insert(ignore_permissions=True, ignore_mandatory=True, ignore_links=True)
		frappe.db.commit()

		# Create clickable link using frappe.utils.get_link_to_form
		link = get_link_to_form("Vehicles Service", service.name, service.name)

		# Show popup message with clickable link
		frappe.msgprint(
			msg=f"✅ Vehicle Service {link} created from Booking ",
			title="Service Created"
		)

		return service.name

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "create_service_from_booking Error")
		frappe.throw(f"Error while creating service: {str(e)}")

