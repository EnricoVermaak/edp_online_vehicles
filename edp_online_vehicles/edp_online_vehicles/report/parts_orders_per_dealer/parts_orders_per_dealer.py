# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.query_builder.functions import Count, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"fieldname": "dealer", "label": _("Dealer"), "fieldtype": "Data", "width": 250},
		{"fieldname": "part_no", "label": _("Part"), "fieldtype": "Data", "width": 150},
		{"fieldname": "description", "label": _("Part Description"), "fieldtype": "Data", "width": 250},
		{"fieldname": "total_parts_ordered", "label": _("Total Parts"), "fieldtype": "Int", "width": 150},
		{"fieldname": "orders_count", "label": _("Amount of Orders"), "fieldtype": "Int", "width": 150},
	]

	return columns


def get_data(filters):
	order = DocType("Part Order")
	parts = DocType("Part Order Item")

	query = (
		frappe.qb.from_(parts)
		.join(order)
		.on(order.name == parts.parent)
		.where(order.creation.between(filters.from_date, filters.to_date))
		.groupby(parts.part_no, order.dealer)
		.select(
			order.dealer,
			parts.part_no,
			parts.description,
			Sum(parts.qty).as_("total_parts_ordered"),
			Count(order.name).distinct().as_("orders_count"),
		)
	)

	if filters.get("dealer"):
		query = query.where(order.dealer == filters.dealer)

	# Order the results by the dealer field
	query = query.orderby(order.dealer)

	return query.run(as_dict=True)
