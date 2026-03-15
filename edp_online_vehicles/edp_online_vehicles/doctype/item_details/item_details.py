# Copyright (c) 2026, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ItemDetails(Document):
	@frappe.whitelist()
	def create_item(self):
		pass
