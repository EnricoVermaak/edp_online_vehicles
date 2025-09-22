# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Count, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"label": _("Part No"), "fieldname": "part_no", "fieldtype": "Data", "width": 150},
		{"label": _("Qty"), "fieldname": "qty", "fieldtype": "Data", "width": 150},
		{"label": _("Total Parts Price"), "fieldname": "total_price", "fieldtype": "Currency", "width": 150},
		{
			"label": _("Amount of Warranties"),
			"fieldname": "warranty_amount",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	warranty = frappe.qb.DocType("Vehicles Warranty Claims")
	parts = frappe.qb.DocType("Warranty Part Item")

	query = (
		frappe.qb.from_(parts)
		.join(warranty)
		.on(parts.parent == warranty.name)
		.where(
			(warranty.creation.between(filters.from_date, filters.to_date))
			& (warranty.docstatus != 2)
			& parts.part_no.isnotnull()
			& (warranty.dealer == filters.dealer)
		)
		.groupby(parts.part_no)
		.select(
			parts.part_no,
			Sum(parts.qty).as_("qty"),
			Sum(parts.price).as_("total_price"),
			Count(warranty.name).as_("warranty_amount"),
		)
	)

	if filters.get("customer"):
		query = query.where(warranty.customer == filters.customer)

	return query.run(as_dict=True)
