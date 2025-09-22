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
		{"fieldname": "part_no", "label": _("Part No"), "fieldtype": "Data", "width": 150},
		{"fieldname": "description", "label": _("Item Description"), "fieldtype": "Data", "width": 150},
		{"fieldname": "total_qty", "label": _("Total Qty"), "fieldtype": "Int", "width": 150},
	]
	return columns


def get_data(filters):
	warranty = DocType("Vehicles Warranty Claims")
	parts = DocType("Warranty Part Item")

	query = (
		frappe.qb.from_(parts)
		.join(warranty)
		.on(warranty.name == parts.parent)
		.where(warranty.creation.between(filters.from_date, filters.to_date))
		.groupby(parts.part_no)
		.select(
			parts.part_no,
			parts.description,
			Sum(parts.qty).as_("total_qty"),
		)
	)

	return query.run(as_dict=True)
