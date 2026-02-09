# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class FleetCustomer(Document):
	def autoname(self):
		# Use db.get_value so dealers don't need Vehicle Stock Settings read permission
		prefix = frappe.db.get_value(
			"Vehicle Stock Settings", "Vehicle Stock Settings", "fleet_customer_prefix"
		)
		if prefix:
			self.name = make_autoname(f"{prefix}.#######")
		else:
			self.name = make_autoname("FC.#######")

	def before_save(self):
		self.fleet_code = self.name

	def after_insert(self):
		# Update last_fleet_no so next creation gets correct sequence (no Settings permission needed)
		if self.fleet_code:
			frappe.db.set_value(
				"Vehicle Stock Settings",
				"Vehicle Stock Settings",
				"last_fleet_no",
				self.fleet_code,
			)
