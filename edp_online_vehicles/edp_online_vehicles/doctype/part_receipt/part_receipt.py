# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PartReceipt(Document):
	pass


@frappe.whitelist()
def check_item(part_no):
	if frappe.db.exists("Item", {"name": part_no, "item_group": "Parts"}):
		item_doc = frappe.get_doc("Item", part_no)

		if item_doc:
			return item_doc
	else:
		return False
