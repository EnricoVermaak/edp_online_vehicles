# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PartPickingSlip(Document):
	def autoname(self):
		# Check if there are existing orders with the same part_order_no
		if frappe.db.exists("Parts Delivery Note", {"part_order_no": self.part_order_no}):
			docs = frappe.get_all("Parts Delivery Note", filters={"part_order_no": self.part_order_no})

			index = 1

			if len(docs) > 0:
				index = (
					max(
						[
							int(doc.get("name").split("-")[3])
							for doc in docs
							if doc.get("name").split("-")[3].isdigit()
						],
						default=0,
					)
					+ 1
				)
		else:
			index = 1

		self.name = f"PPS-{self.part_order_no}-{index}"

	def on_submit(self):
		# Retrieve the HQ Part Order document
		hq_doc = frappe.get_doc("HQ Part Order", self.part_order_no)
		hq_doc.db_set("part_picking_slip", self.name, notify=True)


		for slip_row in self.table_qoik:
			for hq_row in hq_doc.table_ugma:
				if hq_row.part_no == slip_row.part_no:
					hq_row.db_set("qty_picked", slip_row.qty_picked)

		frappe.db.commit()
		self.create_pick_list()

	def before_submit(self):
		self.status = "Completed"

	def create_pick_list(self):
		if not self.part_order_no:
			frappe.throw("HQ Part Order is required")

		# 1. HQ Part Order
		hq_order = frappe.get_doc("HQ Part Order", self.part_order_no)

		if not hq_order.part_order:
			frappe.throw("Part Order not linked in HQ Part Order")

		# 2. Part Order
		part_order = hq_order.part_order

		# 2. Find Sales Order linked to Part Order
		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": part_order},
			# , "docstatus": 1
			"name"
		)

		if not sales_order:
			frappe.throw(f"No submitted Sales Order found for Part Order {part_order}")

		so = frappe.get_doc("Sales Order", sales_order)

		# 3. Prevent duplicate Pick List
		if frappe.db.exists("Pick List", {"sales_order": so.name}):
			return

		# 4. Create Pick List
		pick_list = frappe.new_doc("Pick List")
		pick_list.sales_order = so.name
		pick_list.parent_warehouse = so.items[0].warehouse if so.items else None
		pick_list.customer = so.customer
		pick_list.company = so.company
		pick_list.purpose = "Delivery"

		for item in so.items:
			pick_list.append("locations", {
				"item_code": item.item_code,
				"qty": item.qty,
				"stock_qty": item.qty,
				"picked_qty": 0,
				"stock_uom": item.stock_uom,
				"uom": item.uom,
				"conversion_factor": item.conversion_factor or 1,
				"warehouse": item.warehouse,
				"sales_order": so.name,
				"sales_order_item": item.name,
				"item_name": item.item_name,})
		pick_list.save()
		pick_list.submit()
