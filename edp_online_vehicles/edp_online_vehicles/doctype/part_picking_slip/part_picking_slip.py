# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


class PartPickingSlip(Document):
	def autoname(self):
		if frappe.db.exists("Part Picking Slip", {"part_order_no": self.part_order_no}):
			docs = frappe.get_all("Part Picking Slip", filters={"part_order_no": self.part_order_no})
			index = 1

			if len(docs) > 0:
				index = (
					max(
						[
							int(doc.get("name").split("-")[-1])
							for doc in docs
							if doc.get("name").split("-")[-1].isdigit()
						],
						default=0,
					)
					+ 1
				)
		else:
			index = 1

		self.name = f"PPS-{self.part_order_no}-{index}"

	def on_submit(self):
		hq_doc = frappe.get_doc("HQ Part Order", self.part_order_no)
		hq_doc.db_set("part_picking_slip", self.name, notify=True)

		for slip_row in self.table_qoik:
			for hq_row in hq_doc.table_ugma:
				if hq_row.part_no == slip_row.part_no:
					hq_row.db_set("qty_picked", slip_row.qty_picked)

			for summary_row in hq_doc.table_qmpy:
				if summary_row.part_no == slip_row.part_no:
					summary_row.db_set("qty_picked", slip_row.qty_picked)

		frappe.db.commit()
		self.create_pick_list()

	def before_submit(self):
		self.status = "Completed"

	def create_pick_list(self):
		if not self.part_order_no:
			frappe.throw("HQ Part Order is required")

		hq_order = frappe.get_doc("HQ Part Order", self.part_order_no)

		if not hq_order.part_order:
			frappe.throw("Part Order not linked in HQ Part Order")

		part_order = hq_order.part_order

		hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": part_order, "company": hq_company, "docstatus": 1},
			"name"
		)

		if not sales_order:
			frappe.log_error(f"No submitted Sales Order found for Part Order {part_order}")
			return

		so = frappe.get_doc("Sales Order", sales_order)

		if frappe.db.exists("Pick List", {"sales_order": so.name, "docstatus": ["!=", 2]}):
			return

		pick_list = frappe.new_doc("Pick List")
		pick_list.sales_order = so.name
		pick_list.parent_warehouse = so.items[0].warehouse if so.items else None
		pick_list.customer = so.customer
		pick_list.company = so.company
		pick_list.purpose = "Delivery"

		picked_map = {}
		for row in self.table_qoik:
			if not row.part_no or not row.qty_picked or row.qty_picked <= 0:
				continue
			picked_map[row.part_no] = picked_map.get(row.part_no, 0) + row.qty_picked

		for item in so.items:
			picked_qty = picked_map.get(item.item_code, 0)
			if picked_qty <= 0:
				continue

			allocated_qty = min(picked_qty, item.qty)
			pick_list.append("locations", {
				"item_code": item.item_code,
				"qty": item.qty,
				"stock_qty": allocated_qty,
				"picked_qty": allocated_qty,
				"stock_uom": item.stock_uom,
				"uom": item.uom,
				"conversion_factor": item.conversion_factor or 1,
				"warehouse": item.warehouse,
				"sales_order": so.name,
				"sales_order_item": item.name,
				"item_name": item.item_name,
			})
			picked_map[item.item_code] = max(picked_qty - allocated_qty, 0)

		if not pick_list.locations:
			frappe.log_error("No picked items matched Sales Order items for Pick List creation")
			return

		pick_list.save()
		pick_list.submit()
