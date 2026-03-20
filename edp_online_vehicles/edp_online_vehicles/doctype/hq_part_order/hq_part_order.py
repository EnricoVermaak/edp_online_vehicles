# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.naming import make_autoname
from frappe.model.document import Document
from frappe.utils import now_datetime, today, flt


def get_company_warehouse(company):
	wh = frappe.db.get_value(
		"Company", company, "custom_default_vehicles_stock_warehouse"
	)
	if not wh:
		frappe.throw(
			f"Default Vehicles Stock Warehouse is not set on Company <b>{company}</b>. "
			"Please set it under Company > Settings before proceeding."
		)
	return wh


class HQPartOrder(Document):
	def autoname(self):
		prefix = frappe.db.get_single_value("Parts Settings", "part_order_no_prefix") or ""
		now = now_datetime()
		mm = now.strftime("%m")
		yy = now.strftime("%y")
		series = f"{prefix}{mm}{yy}.####"
		self.name = make_autoname(series)

	def after_insert(self):
		self._create_sales_order()
		self._create_material_request_for_back_orders()
		self._link_warranty_claim()

	def _create_sales_order(self):
		hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
		if not hq_company:
			return

		part_order = None
		if self.part_order:
			part_order = frappe.get_doc("Part Order", self.part_order)

		so = frappe.new_doc("Sales Order")
		so.customer = self.dealer
		so.order_type = "Sales"
		so.custom_sales_category = "Parts"
		so.custom_part_order = self.part_order
		so.company = hq_company
		so.transaction_date = today()
		so.delivery_date = part_order.delivery_date if part_order else today()

		hq_warehouse = get_company_warehouse(hq_company)

		for item in self.table_ugma:
			so.append("items", {
				"item_code": item.part_no,
				"item_name": item.description,
				"qty": item.qty,
				"uom": item.uom,
				"conversion_factor": 1,
				"base_amount": item.total_excl,
				"base_rate": item.dealer_billing_excl,
				"warehouse": hq_warehouse,
			})

		so.insert(ignore_permissions=True)
		so.submit()

	def _create_material_request_for_back_orders(self):
		back_order_items = [
			item for item in self.table_ugma
			if (item.order_from or "").strip() == "BackOrder"
		]
		if not back_order_items:
			return

		hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
		if not hq_company:
			return

		hq_warehouse = get_company_warehouse(hq_company)

		part_order = None
		if self.part_order:
			part_order = frappe.get_doc("Part Order", self.part_order)

		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": self.part_order, "company": hq_company, "docstatus": 1},
			"name",
		)

		so_item_map = {}
		if sales_order:
			so_doc = frappe.get_doc("Sales Order", sales_order)
			for si in so_doc.items:
				so_item_map[si.item_code] = si.name

		mr = frappe.new_doc("Material Request")
		mr.material_request_type = "Purchase"
		mr.company = hq_company
		mr.transaction_date = today()
		mr.schedule_date = part_order.delivery_date if part_order else today()
		mr.custom_part_order = self.part_order
		mr.custom_hq_part_order = self.name

		for item in back_order_items:
			mr_item = {
				"item_code": item.part_no,
				"qty": item.qty,
				"warehouse": hq_warehouse,
				"schedule_date": part_order.delivery_date if part_order else today(),
				"uom": item.uom or "Unit",
			}
			if item.part_no in so_item_map:
				mr_item["sales_order"] = sales_order
				mr_item["sales_order_item"] = so_item_map[item.part_no]
			mr.append("items", mr_item)

		mr.insert(ignore_permissions=True)
		mr.submit()

		self.db_set("material_request", mr.name, notify=True)

	def _link_warranty_claim(self):
		if not self.get("warranty_claim"):
			return
		wc = frappe.get_doc("Vehicles Warranty Claims", self.warranty_claim)
		ordered_parts = {item.part_no for item in self.table_ugma}
		for row in wc.part_items:
			if row.approved and row.part_no in ordered_parts:
				row.hq_part_order = self.name
		wc.save(ignore_permissions=True)

	def validate(self):
		if not self.table_qmpy:
			if len(self.table_cipd) < len(self.table_ugma):
				for row in self.table_ugma:
					new_row = self.append("table_qmpy", {})
					new_row.part_no = row.part_no
					new_row.part_description = row.description
					new_row.qty_ordered = row.qty
					if (row.order_from or "").strip() == "BackOrder":
						new_row.is_back_order = 1

		undelivered_billing = 0
		undelivered_qty = 0

		if self.table_qmpy:
			for row in self.table_qmpy:
				price_list = flt(frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				))
				remaining = flt(row.qty_ordered) - flt(row.qty_delivered)
				undelivered_billing += price_list * remaining
				undelivered_qty += remaining

		self.total_undelivered_parts_qty = undelivered_qty
		self.total_undelivered_parts_dealer_billing_excl = undelivered_billing

		delivered_billing = 0
		delivered_qty = 0

		if self.table_cipd:
			for row in self.table_cipd:
				price_list = flt(frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				))
				delivered_billing += price_list * flt(row.qty_delivered)
				delivered_qty += flt(row.qty_delivered)

		self.total_delivered_parts_qty = delivered_qty
		self.total_delivered_parts_dealer_billing_excl = delivered_billing

		if not self.total_qty_parts_ordered:
			self.total_qty_parts_ordered = 0

		if flt(self.total_qty_parts_ordered) > 0:
			self.total_qty_parts_delivered = flt(self.total_qty_parts_ordered) - undelivered_qty
			self._order_delivered = (flt(self.total_qty_parts_delivered) / flt(self.total_qty_parts_ordered)) * 100
		else:
			self.total_qty_parts_delivered = 0
			self._order_delivered = 0

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
