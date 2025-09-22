# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.query_builder.functions import Count, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	message = get_message(filters)

	return columns, data, message


def get_columns():
	columns = [
		{"label": _("Labour Code"), "fieldname": "item", "fieldtype": "Data", "width": 150},
		{"label": _("Total Hours"), "fieldname": "total_hours", "fieldtype": "Data", "width": 150},
		{"label": _("Amount of Services"), "fieldname": "service_count", "fieldtype": "Data", "width": 200},
	]

	return columns


def get_message(filters):
	return "This report excludes cancelled services."


def get_data(filters):
	service = DocType("Vehicles Service")
	labour = DocType("Service Labour Items")

	query = (
		frappe.qb.from_(labour)
		.join(service)
		.on(service.name == labour.parent)
		.where(
			(service.creation.between(filters.from_date, filters.to_date))
			& (service.docstatus != 2)
			& (service.dealer == filters.dealer)
		)
		.groupby(labour.item)
		.select(
			labour.item,
			Sum(labour.duration_hours).as_("total_hours"),
			Count(service.name).distinct().as_("service_count"),
		)
	)

	if filters.get("customer"):
		query = query.where(service.customer == filters.customer)

	return query.run(as_dict=True)
