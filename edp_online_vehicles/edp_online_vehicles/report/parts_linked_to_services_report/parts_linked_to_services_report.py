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
		{"label": _("Part Code"), "fieldname": "item", "fieldtype": "Data", "width": 150},
		{"label": _("Qty"), "fieldname": "qty", "fieldtype": "Data", "width": 150},
		{"label": _("Price (Excl)"), "fieldname": "price_excl", "fieldtype": "Currency", "width": 150},
		{"label": _("Total (Excl)"), "fieldname": "total_excl", "fieldtype": "Currency", "width": 150},
	]

	return columns


def get_data(filters):
	service = DocType("Vehicles Service")
	parts = DocType("Service Parts Items")

	query = (
		frappe.qb.from_(parts)
		.join(service)
		.on(service.name == parts.parent)
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
			parts.item,
			parts.qty,
			parts.price_excl,
			parts.total_excl,
		)
	)

	return query.run(as_dict=True)
