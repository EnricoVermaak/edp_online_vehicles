# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class HQPartOrder(Document):
	def validate(self):
		total_dealer_billing = 0
		total_delivered = 0

		if not self.table_qmpy:
			if len(self.table_cipd) < len(self.table_ugma):
				for row in self.table_ugma:
					new_row = self.append("table_qmpy", {})
					new_row.part_no = row.part_no
					new_row.part_description = row.description
					new_row.qty_ordered = row.qty

		if self.table_qmpy:
			for row in self.table_qmpy:
				price_list = frappe.db.get_value("Item Price", {"item_code": row.part_no}, "price_list_rate")

				total_dealer_billing += price_list * (row.qty_ordered - (row.qty_delivered or 0))
				total_delivered += row.qty_ordered - (row.qty_delivered or 0)

			self.total_undelivered_parts_qty = total_delivered
			self.total_undelivered_parts_dealer_billing_excl = total_dealer_billing
		else:
			self.total_undelivered_parts_qty = 0
			self.total_undelivered_parts_dealer_billing_excl = 0

		total_dealer_billing = 0
		total_delivered = 0

		if self.table_cipd:
			for row in self.table_cipd:
				price_list = frappe.db.get_value("Item Price", {"item_code": row.part_no}, "price_list_rate")

				total_dealer_billing += price_list * row.qty_delivered
				total_delivered += row.qty_delivered

			self.total_delivered_parts_qty = total_delivered
			self.total_delivered_parts_dealer_billing_excl = total_dealer_billing
		else:
			self.total_delivered_parts_qty = 0
			self.total_delivered_parts_dealer_billing_excl = 0

		if self.total_qty_parts_ordered > 0:
			self.total_qty_parts_delivered = self.total_qty_parts_ordered - self.total_undelivered_parts_qty

		if self.total_qty_parts_delivered > 0:
			self._order_delivered = (self.total_qty_parts_delivered / self.total_qty_parts_ordered) * 100

		if not self.part_order_status:
			default_status = frappe.db.get_value("Part Order Status", {"is_default": 1}, "name")

			self.part_order_status = default_status

		if not self.order_type:
			default_type = frappe.db.get_value("Part Order Type", {"is_default": 1}, "name")

			self.order_type = default_type

	def before_insert(self):
		total_parts_ordered = 0

		for item in self.table_ugma:
			total_parts_ordered += item.qty

		self.total_qty_parts_ordered = total_parts_ordered
