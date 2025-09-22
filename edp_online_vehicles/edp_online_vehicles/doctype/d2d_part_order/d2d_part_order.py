# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
import frappe.utils
from frappe.model.document import Document


class D2DPartOrder(Document):
	def validate(self):
		total_dealer_billing = 0
		total_delivered = 0

		if not self.table_mzrh:
			if len(self.table_mqnk) < len(self.table_oqak):
				for row in self.table_oqak:
					new_row = self.append("table_mzrh", {})
					new_row.part_no = row.part_no
					new_row.part_description = row.description
					new_row.qty_ordered = row.qty
					new_row.dealer = row.dealer

		if self.table_mzrh:
			for row in self.table_mzrh:
				price_list = frappe.db.get_value("Item Price", {"item_code": row.part_no}, "price_list_rate")

				total_dealer_billing += price_list * (row.qty_ordered - (row.qty_delivered or 0))
				total_delivered += row.qty_ordered - (row.qty_delivered or 0)

			self.total_undelivered_parts_qty = total_delivered
			self.total_undelivered_parts_dealer_billing = total_dealer_billing
		else:
			self.total_undelivered_parts_qty = 0
			self.total_undelivered_parts_dealer_billing_excl = 0

		total_dealer_billing = 0
		total_delivered = 0

		if self.table_mqnk:
			for row in self.table_mqnk:
				price_list = frappe.db.get_value("Item Price", {"item_code": row.part_no}, "price_list_rate")

				total_dealer_billing += price_list * row.qty_delivered
				total_delivered += row.qty_delivered

			self.total_delivered_parts_qty = total_delivered
			self.total_delivered_parts_dealer_billing = total_dealer_billing
		else:
			self.total_delivered_parts_qty = 0
			self.total_delivered_parts_dealer_billing = 0

		self.total_qty_parts_delivered = self.total_qty_parts_ordered - self.total_undelivered_parts_qty
		self._order_delivered = (self.total_qty_parts_delivered / self.total_qty_parts_ordered) * 100

	def before_insert(self):
		total_parts_ordered = 0

		for item in self.table_oqak:
			total_parts_ordered += item.qty

		self.total_qty_parts_ordered = total_parts_ordered
