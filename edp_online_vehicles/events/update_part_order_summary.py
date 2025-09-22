import json

import frappe


@frappe.whitelist()
def update_delivered_parts(part_order_no, parts):
	parts = json.loads(parts)
	hq_doc = frappe.get_doc("HQ Part Order", part_order_no)

	hq_doc.table_qmpy.clear()
	hq_doc.table_cipd.clear()

	for part in parts:
		qty_ordered = int(part.get("qty_ordered", 0))
		qty_delivered = int(part.get("qty_delivered", 0))

		percentage_delivered = (qty_delivered / qty_ordered) * 100

		target_table = "table_qmpy" if percentage_delivered < 100 else "table_cipd"

		hq_doc.append(
			target_table,
			{
				"part_no": part.get("part_no"),
				"qty_ordered": qty_ordered,
				"qty_delivered": qty_delivered,
				"delivery_time_hours": part.get("despatch_time"),
				"_delivered": percentage_delivered,
			},
		)

	hq_doc.save()
	frappe.db.commit()


@frappe.whitelist()
def update_parts_order(part_order_no, undelivered_parts, delivered_parts):
	order_doc = frappe.get_doc("Part Order", part_order_no)
	json.loads(undelivered_parts)
	json.loads(delivered_parts)

	if undelivered_parts:
		for part in undelivered_parts:
			order_doc.append(
				"table_eaco",
				{
					"part_no": part.get("part_no"),
					"part_description": part.get("description"),
					"qty_ordered": part.get("qty_ordered"),
					"qty_delivered": part.get("qty_delivered"),
					"qty_invoiced": part.get("qty_invoiced"),
					"_delivered": part.get("_delivered"),
					"qty_picked": part.get("qty_picked"),
				},
			)

	if delivered_parts:
		for part in delivered_parts:
			order_doc.append(
				"table_poxl",
				{
					"part_no": part.get("part_no"),
					"part_description": part.get("description"),
					"qty_ordered": part.get("qty_ordered"),
					"qty_delivered": part.get("qty_delivered"),
					"qty_invoiced": part.get("qty_invoiced"),
					"_delivered": part.get("_delivered"),
					"qty_picked": part.get("qty_picked"),
				},
			)

	order_doc.save()
	frappe.db.commit()
