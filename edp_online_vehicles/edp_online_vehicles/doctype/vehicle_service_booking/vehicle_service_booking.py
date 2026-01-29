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


