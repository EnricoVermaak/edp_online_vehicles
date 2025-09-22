# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Date


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"fieldname": "customer", "label": _("Customer"), "fieldtype": "Data", "width": 150},
		{
			"fieldname": "vinserial_no",
			"label": _("Vehicles VIN No/ Serial No"),
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"fieldname": "odo_reading_hours",
			"label": _("Odo Reading/ Hours"),
			"fieldtype": "Data",
			"width": 150,
		},
		{"fieldname": "current_location", "label": _("Current Location"), "fieldtype": "Data", "width": 150},
		{"fieldname": "service_date", "label": _("Service Date"), "fieldtype": "Data", "width": 150},
		{"fieldname": "service_type", "label": _("Service Type"), "fieldtype": "Data", "width": 150},
		{
			"fieldname": "parts_total_excl",
			"label": _("Parts Total (Excl)"),
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"fieldname": "labours_total_excl",
			"label": _("Labours Total (Excl)"),
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"fieldname": "authorised_by_full_names",
			"label": _("Authorised By Full Names"),
			"fieldtype": "Data",
			"width": 150,
		},
	]
	return columns


def get_data(filters):
	services = frappe.qb.DocType("Vehicles Service")

	query = (
		frappe.qb.from_(services)
		.select(
			services.customer,
			services.vinserial_no,
			services.odo_reading_hours,
			services.current_location,
			services.service_date,
			services.service_type,
			services.parts_total_excl,
			services.labours_total_excl,
			services.authorised_by_full_names,
			services.dealer,
		)
		.where(
			Date(services.creation).between(filters.from_date, filters.to_date)
			& (services.dealer == filters.dealer)
		)
	)

	if filters.get("customer"):
		query = query.where(services.customer == filters.get("customer"))

	return query.run(as_dict=1)
