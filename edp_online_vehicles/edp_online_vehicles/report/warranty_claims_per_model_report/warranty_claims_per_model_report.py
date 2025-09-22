# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Coalesce, Count, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	message = get_message()

	return columns, data, message


def get_columns():
	columns = [
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Amount of Warranties"),
			"fieldname": "warranty_amount",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Total Part Price"),
			"fieldname": "total_part_price",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Total Labour Price"),
			"fieldname": "total_labour_price",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Total Exstra Price"),
			"fieldname": "total_extra_price",
			"fieldtype": "Currency",
			"width": 150,
		},
		{"label": _("Avg Total"), "fieldname": "avg_total", "fieldtype": "Currency", "width": 150},
		{"label": _("Total"), "fieldname": "total", "fieldtype": "Currency", "width": 150},
	]

	return columns


def get_message():
	return "This report excludes cancelled warranties."


def get_data(filters):
	if not filters:
		filters = {}

	warranty = frappe.qb.DocType("Vehicles Warranty Claims")
	parts = frappe.qb.DocType("Warranty Part Item")
	labour = frappe.qb.DocType("Warranty Labour Item")

	query = (
		frappe.qb.from_(warranty)
		.left_join(parts)
		.on(parts.parent == warranty.name)
		.left_join(labour)
		.on(labour.parent == warranty.name)
		.select(
			warranty.model,
			warranty.model_description,
			Count(warranty.name).as_("warranty_amount"),
			Coalesce(Sum(parts.price), 0).as_("total_part_price"),
			Coalesce(Sum(labour.price), 0).as_("total_labour_price"),
			Sum(warranty.extra_cost_total_excl).as_("total_extra_price"),
		)
		.where(
			warranty.model.isnotnull()
			& (warranty.docstatus != 2)
			& (warranty.creation.between(filters.from_date, filters.to_date))
			& (warranty.dealer == filters.dealer)
		)
	)

	if filters.get("customer"):
		query = query.where(warranty.customer == filters.customer)

	query = query.groupby(warranty.model)

	warranties = query.run(as_dict=True)

	frappe.log(warranties)

	for Warranty in warranties:
		total_cost = (
			Warranty["total_part_price"] + Warranty["total_labour_price"] + Warranty["total_extra_price"]
		)
		Warranty["total"] = total_cost
		Warranty["avg_total"] = total_cost / Warranty["warranty_amount"] if Warranty["warranty_amount"] else 0

	return warranties
