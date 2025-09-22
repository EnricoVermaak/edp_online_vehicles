# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.utils import nowdate


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Warranty Start Date"),
			"fieldname": "warranty_start_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Warranty Period (Years)"),
			"fieldname": "warranty_period_years",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Extended Warranty Start Date"),
			"fieldname": "extended_warranty_start_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Extended Warranty Period (Years)"),
			"fieldname": "extended_warranty_period",
			"fieldtype": "Int",
			"width": 150,
		},
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 150},
		{"label": _("Odo Reading"), "fieldname": "odo_reading", "fieldtype": "Int", "width": 150},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Phone"), "fieldname": "phone", "fieldtype": "Phone", "width": 150},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 150},
	]

	return columns


def get_data(filters):
	claims = DocType("Vehicles Warranty Claims")
	today = nowdate()

	query = (
		frappe.qb.from_(claims)
		.select(
			claims.warranty_start_date,
			claims.warranty_period_years,
			claims.extended_warranty_start_date,
			claims.extended_warranty_period,
			claims.vin_serial_no,
			claims.model,
			claims.model_description,
			claims.model_year,
			claims.odo_reading,
			claims.customer,
			claims.customer_name,
			claims.phone,
			claims.email,
		)
		.where(claims.warranty_end_date < today)
	)

	if filters.get("customer"):
		query = query.where(claims.customer == filters.customer)

	return query.run(as_dict=True)
