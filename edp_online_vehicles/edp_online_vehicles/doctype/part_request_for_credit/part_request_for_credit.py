# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PartRequestForCredit(Document):
	def validate(self):
		if self.status == "Completed":
			submit_flag = True

			for row in self.table_cxdf:
				if row.status == "Approved":
					if row.approved_qty != row.return_qty:
						self.status = "In Progress"
						submit_flag = False
						frappe.throw(
							"Please ensure all Approved parts have an approved quantity assigned to them."
						)

			if submit_flag:
				self.submit()

		if self.status == "Cancelled":
			for row in self.table_cxdf:
				row.status = "Cancelled"

			self.submit()
