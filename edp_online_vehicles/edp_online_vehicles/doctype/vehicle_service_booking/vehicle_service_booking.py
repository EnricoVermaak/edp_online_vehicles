# Copyright (c) 2025, NexTash
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form
import re


class VehicleServiceBooking(Document):
	def validate(self):
		self._set_system_status_from_odo_range()

	def _set_system_status_from_odo_range(self):
		if not (self.odo_reading_hours and self.service_type and self.model):
			self.system_status = None
			return
		interval = frappe.db.get_value("Service Schedules", self.service_type, "interval") or 0
		model_data = frappe.db.get_value(
			"Model Administration",
			self.model,
			["service_type_max_allowance", "service_type_minimum_allowance"],
			as_dict=True,
		) or {}
		max_allowance = int(model_data.get("service_type_max_allowance") or 0)
		min_allowance = int(model_data.get("service_type_minimum_allowance") or 0)
		min_odo = int(interval) - min_allowance
		max_odo = int(interval) + max_allowance
		odo = int(self.odo_reading_hours or 0)
		if min_odo <= odo <= max_odo:
			self.system_status = "Conditionally Approved"
		else:
			self.system_status = "Conditionally Declined"


@frappe.whitelist()
def check_and_update_odo(vin_serial_no, odo_reading_hours):
    """
    Validates the odo_reading_hours.
    Throws an error if odo_reading_hours is lower than Vehicle Stock reading
    and rollback is not allowed.
    """

    # VIN/Serial check
    if not vin_serial_no:
        frappe.throw(_("Please enter the Vehicle VIN No/ Serial No"))

    # Check if rollback is allowed
    allow_rollback = frappe.db.get_single_value(
        "Vehicle Service Booking Settings",
        "allow_service_odo_reading_roll_back"
    )

    # Get current odo from Vehicle Stock
    stock_odo = frappe.get_value("Vehicle Stock", vin_serial_no, "odo_reading") or 0

    # Rollback validation
    if not allow_rollback and odo_reading_hours < stock_odo:
        frappe.throw(
            _("The entered odometer reading cannot be lower than the previous stock reading of {0}").format(stock_odo)
        )
		frm.set_value("odo_reading_hours", null)  # Clear the invalid input

    # Update stock if new reading is higher
    if odo_reading_hours > stock_odo:
        frappe.db.set_value("Vehicle Stock", vin_serial_no, "odo_reading", odo_reading_hours)

    return {
        "status": "success",
    }


@frappe.whitelist()
def update_vehicle_stock(doc, method):
    """
    Update the Vehicle Stock's odo_reading if the service odo_reading_hours is higher.
    """
    if doc.vin_serial_no and doc.odo_reading_hours:

        stock_odo = frappe.get_value("Vehicle Stock", doc.vin_serial_no, "odo_reading") or 0

        if doc.odo_reading_hours > stock_odo:
            frappe.db.set_value("Vehicle Stock", doc.vin_serial_no, "odo_reading", doc.odo_reading_hours)
		


