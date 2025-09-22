# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import json

import frappe
from frappe import _
from frappe.model.document import Document


class PartShipment(Document):
	@frappe.whitelist()
	def create_stock_entry(self, selected_items):
		selected_items = json.loads(selected_items)
		stock_entry = self.create_stock_entry_for_serial_numbers(selected_items)
		frappe.db.commit()
		if stock_entry == "Received":
			return "Received"

	def create_stock_entry_for_serial_numbers(self, selected_items):
		stock_entry = frappe.get_doc(
			{"doctype": "Stock Entry", "stock_entry_type": "Material Receipt", "items": []}
		)

		for item in selected_items:
			if not item.get("target_warehouse"):
				frappe.throw(_("Target warehouse is missing for item"))

			stock_entry.append(
				"items",
				{
					"item_code": item.get("part_no"),
					"qty": item.get("qty"),
					"basic_rate": item.get("price_per_part_excl"),
					"t_warehouse": item.get("target_warehouse"),
				},
			)
		stock_entry.save(ignore_permissions=True)
		stock_entry.submit()
		return "Received"
