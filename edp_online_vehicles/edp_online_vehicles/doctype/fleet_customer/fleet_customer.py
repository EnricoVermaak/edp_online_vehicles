# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class FleetCustomer(Document):
	def autoname(self):
		prefix = frappe.get_single("Vehicle Stock Settings").fleet_customer_prefix

		# date = current_month_year = getdate().strftime('%m%y')

		if prefix:
			self.name = make_autoname(f"{prefix}.#######")
		else:
			self.name = make_autoname("FC.#######")

	def before_save(self):
		self.fleet_code = self.name
