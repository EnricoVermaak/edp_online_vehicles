# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.query_builder.functions import Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"fieldname": "dealer", "label": _("Dealer"), "fieldtype": "Data", "width": 120},
		{"fieldname": "qty_ordered", "label": _("Qty Ordered"), "fieldtype": "Int", "width": 120},
		{"fieldname": "qty_delivered", "label": _("Qty Delivered"), "fieldtype": "Int", "width": 120},
		{"fieldname": "supply_rate", "label": _("Supply Rate"), "fieldtype": "Percent", "width": 120},
	]

	return columns


def get_data(filters):
	hq_order = DocType("HQ Part Order")
	item = DocType("Part Order Summary Item")

	query = (
		frappe.qb.from_(item)
		.left_join(hq_order)
		.on(hq_order.name == item.parent)
		.select(
			(hq_order.name).as_("order_no"),
			hq_order.dealer,
			hq_order.order_date_time,
			item.part_no,
			item.part_description,
			Sum(item.qty_ordered).as_("qty_ordered"),
			Sum(item.qty_delivered).as_("qty_delivered"),
		)
		.groupby(hq_order.dealer)
		.where(hq_order.creation.between(filters.from_date, filters.to_date))
	)

	if filters.get("dealer"):
		query = query.where(hq_order.dealer == filters.dealer)

	orders = query.run(as_dict=True)

	for order in orders:
		supply_rate = (order["qty_delivered"] / order["qty_ordered"]) * 100

		order["supply_rate"] = supply_rate

	return orders
