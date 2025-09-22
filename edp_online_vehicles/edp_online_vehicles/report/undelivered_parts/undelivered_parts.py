# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"fieldname": "order_no",
			"label": _("Order No"),
			"fieldtype": "Link",
			"options": "Part Order",
			"width": 150,
		},
		{"fieldname": "dealer", "label": _("Dealer"), "fieldtype": "Data", "width": 250},
		{"fieldname": "order_date_time", "label": _("Order Date"), "fieldtype": "Datetime", "width": 200},
		{"fieldname": "part_no", "label": _("Part No"), "fieldtype": "Data", "width": 150},
		{"fieldname": "part_description", "label": _("Part Description"), "fieldtype": "Data", "width": 200},
		{"fieldname": "qty_ordered", "label": _("Ordered Qty"), "fieldtype": "Int", "width": 120},
		{"fieldname": "qty_delivered", "label": _("Delivered Qty"), "fieldtype": "Int", "width": 120},
		{"fieldname": "qty_to_deliver", "label": _("Qty to be Delivered"), "fieldtype": "Int", "width": 120},
	]

	return columns


def get_data(filters):
	order = DocType("Part Order")
	item = DocType("Part Order Summary Item")

	query = (
		frappe.qb.from_(item)
		.left_join(order)
		.on(order.name == item.parent)
		.select(
			(order.name).as_("order_no"),
			order.dealer,
			order.order_date_time,
			item.part_no,
			item.part_description,
			item.qty_ordered,
			item.qty_delivered,
		)
		.where(
			(order.creation.between(filters.from_date, filters.to_date))
			& (item.qty_ordered > item.qty_delivered)
		)
	)

	if filters.get("dealer"):
		query = query.where(order.dealer == filters.dealer)

	orders = query.run(as_dict=True)

	for order in orders:
		qty_to_deliver = order["qty_ordered"] - order["qty_delivered"]

		order["qty_to_deliver"] = qty_to_deliver

	return orders
