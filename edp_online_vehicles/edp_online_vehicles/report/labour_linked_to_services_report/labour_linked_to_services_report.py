# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	message = "This report excludes cancelled services."

	return columns, data, message


def get_columns():
	columns = [
		{
			"label": _("Document ID"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Vehicles Service",
			"width": 150,
		},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Job Card No"), "fieldname": "job_card_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Vehicles VIN No/ Serial No"),
			"fieldname": "vinserial_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{"label": _("Service Type"), "fieldname": "service_type", "fieldtype": "Data", "width": 150},
		{"label": _("Labour Code"), "fieldname": "item", "fieldtype": "Data", "width": 150},
		{"label": _("Duration Total"), "fieldname": "duration_hours", "fieldtype": "Data", "width": 150},
		{"label": _("Rate/ Hour"), "fieldname": "rate_hour", "fieldtype": "Currency", "width": 150},
		{
			"label": _("Labours Total (Excl)"),
			"fieldname": "total_excl",
			"fieldtype": "Currency",
			"width": 150,
		},
	]

	return columns


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
		.select(
			service.name,
			service.customer,
			service.job_card_no,
			service.vinserial_no,
			service.model,
			service.service_type,
			labour.item,
			labour.duration_hours,
			labour.rate_hour,
			labour.total_excl,
		)
	)

	return query.run(as_dict=True)
