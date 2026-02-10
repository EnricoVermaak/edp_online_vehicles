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

		# Loop through each part in the delivery_note_item child table
		for part in self.table_qoik:
			# Search for a matching record in table_qmpy by part_no
			matching_record = None
			for rec in hq_doc.get("table_qmpy"):
				if rec.part_no == part.part_no:
					matching_record = rec
					break

					# If no matching record is found, skip this part
			if not matching_record:
				continue

				# Update cumulative qty_delivered by adding the current delivery's qty_delivered
			matching_record.qty_picked += part.qty_picked

		hq_doc.save()
		frappe.db.commit()

	def before_submit(self):
		self.status = "Completed"

	def after_insert(self):
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

		# for item in so.items:
		# 	# frappe.throw(f"Processing item: {item.item_code}")
		# 	pick_list.append("locations", {
		# 		"item_code": item.item_code,
		# 		"qty": item.qty,
		# 		"stock_uom": item.uom,
		# 		"warehouse": item.warehouse,
		# 		"sales_order": so.name,
		# 		"sales_order_item": item.name
		# 	})
		# pick_list.set_item_locations()

		pick_list.save()
		pick_doc = frappe.get_doc("Pick List", pick_list.name)
		for item in so.items:
			# frappe.throw(f"Processing item: {item.item_code}")
			pick_doc.append("locations", {
				"item_code": item.item_code,
				"qty": item.qty,
				"stock_uom": item.uom,
				"warehouse": item.warehouse,
				"sales_order": so.name,
				"sales_order_item": item.name
			})
		pick_doc.save()

		# pick_list.submit()

		# self.db_set("pick_list", pick_list.name)
