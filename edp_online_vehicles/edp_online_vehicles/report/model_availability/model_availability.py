# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Count


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	return columns, data


def get_columns():
	return [
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 120},
		{"label": _("Available Models"), "fieldname": "available_models", "fieldtype": "Int", "width": 120},
	]


def get_data(filters):
	stock = frappe.qb.DocType("Vehicle Stock")

	query = (
		frappe.qb.from_(stock)
		.select(
			stock.model,
			Count(stock.model).as_("available_models"),
		)
		.where(stock.model.isnotnull())
	)
	if filters.get("dealer"):
		query = query.where(stock.dealer == filters.dealer)

	query = query.groupby(stock.model)

	return query.run(as_dict=True)
