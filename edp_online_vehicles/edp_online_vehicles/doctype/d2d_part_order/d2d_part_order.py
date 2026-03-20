# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
import frappe.utils
from frappe.model.document import Document
from frappe.utils import today, flt

from edp_online_vehicles.edp_online_vehicles.doctype.hq_part_order.hq_part_order import (
	get_company_warehouse,
)


class D2DPartOrder(Document):

	def after_insert(self):
		self._create_sales_order()

	def _create_sales_order(self):
		part_order = None
		if self.part_order:
			part_order = frappe.get_doc("Part Order", self.part_order)

		so = frappe.new_doc("Sales Order")
		so.customer = self.order_placed_by
		so.order_type = "Sales"
		so.custom_sales_category = "Parts"
		so.custom_part_order = self.part_order
		so.company = self.order_placed_to
		so.transaction_date = today()
		so.delivery_date = part_order.delivery_date if part_order else today()

		supplier_warehouse = get_company_warehouse(self.order_placed_to)

		for item in self.table_oqak:
			so.append("items", {
				"item_code": item.part_no,
				"item_name": item.description,
				"qty": item.qty,
				"uom": item.uom,
				"conversion_factor": 1,
				"base_amount": item.total_excl,
				"base_rate": item.dealer_billing_excl,
				"warehouse": supplier_warehouse,
			})

		so.insert(ignore_permissions=True)
		so.submit()

	def validate(self):
		if not self.table_mzrh:
			if len(self.table_mqnk) < len(self.table_oqak):
				for row in self.table_oqak:
					new_row = self.append("table_mzrh", {})
					new_row.part_no = row.part_no
					new_row.part_description = row.description
					new_row.qty_ordered = row.qty
					new_row.dealer = row.dealer

		undelivered_billing = 0
		undelivered_qty = 0

		if self.table_mzrh:
			for row in self.table_mzrh:
				price_list = flt(frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				))
				remaining = flt(row.qty_ordered) - flt(row.qty_delivered)
				undelivered_billing += price_list * remaining
				undelivered_qty += remaining

		self.total_undelivered_parts_qty = int(undelivered_qty)
		self.total_undelivered_parts_dealer_billing = flt(undelivered_billing, 2)

		delivered_billing = 0
		delivered_qty = 0

		if self.table_mqnk:
			for row in self.table_mqnk:
				price_list = flt(frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				))
				delivered_billing += price_list * flt(row.qty_delivered)
				delivered_qty += flt(row.qty_delivered)

		self.total_delivered_parts_qty = int(delivered_qty)
		self.total_delivered_parts_dealer_billing = flt(delivered_billing, 2)

		if flt(self.total_qty_parts_ordered) > 0:
			self.total_qty_parts_delivered = int(flt(self.total_qty_parts_ordered) - undelivered_qty)
			self._order_delivered = flt(
				(flt(self.total_qty_parts_delivered) / flt(self.total_qty_parts_ordered)) * 100, 9
			)
		else:
			self.total_qty_parts_delivered = 0
			self._order_delivered = 0

	def before_insert(self):
		total_parts_ordered = 0
		for item in self.table_oqak:
			total_parts_ordered += item.qty
		self.total_qty_parts_ordered = total_parts_ordered
