# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Odo Reading/ Hours"),
			"fieldname": "odo_reading_hours",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 150},
		{"label": _("Model Code"), "fieldname": "model_code", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 150},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{
			"label": _("Driver Full Names"),
			"fieldname": "driver_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Driver Contact No"),
			"fieldname": "driver_contact_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Insurance Company"),
			"fieldname": "insurance_company",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Policy No"), "fieldname": "policy_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Incident Date/ Time"),
			"fieldname": "incident_date_time",
			"fieldtype": "Datetime",
			"width": 150,
		},
		{"label": _("Location"), "fieldname": "location", "fieldtype": "Data", "width": 150},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{"label": _("Case No"), "fieldname": "case_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Internal Investigator"),
			"fieldname": "internal_investigator",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Incident Type"), "fieldname": "incident_type", "fieldtype": "Data", "width": 150},
		{
			"label": _("Incident Description"),
			"fieldname": "incident_description",
			"fieldtype": "Text Editor",
			"width": 150,
		},
		{
			"label": _("Witness Information"),
			"fieldname": "witness_information",
			"fieldtype": "Text Editor",
			"width": 150,
		},
		{
			"label": _("Damage Assesment"),
			"fieldname": "damage_assesment",
			"fieldtype": "Text Editor",
			"width": 150,
		},
		{"label": _("Injuries"), "fieldname": "injuries", "fieldtype": "Data", "width": 150},
		{"label": _("Police Report No"), "fieldname": "police_report_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Responding Officer"),
			"fieldname": "responding_officer",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Investigating Officer"),
			"fieldname": "investigating_officer",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Driver"), "fieldname": "driver", "fieldtype": "Data", "width": 150},
		{
			"label": _("Internal Investigator Full Names"),
			"fieldname": "internal_investigator_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Management Full Names"),
			"fieldname": "management_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	incedents = DocType("Vehicles Incidents")

	query = (
		frappe.qb.from_(incedents)
		.select(
			incedents.vin_serial_no,
			incedents.odo_reading_hours,
			incedents.brand,
			incedents.model_code,
			incedents.model_description,
			incedents.model_year,
			incedents.customer,
			incedents.driver_full_names,
			incedents.driver_contact_no,
			incedents.insurance_company,
			incedents.policy_no,
			incedents.incident_date_time,
			incedents.location,
			incedents.status,
			incedents.case_no,
			incedents.internal_investigator,
			incedents.incident_type,
			incedents.incident_description,
			incedents.witness_information,
			incedents.damage_assesment,
			incedents.injuries,
			incedents.police_report_no,
			incedents.responding_officer,
			incedents.investigating_officer,
			incedents.driver,
			incedents.internal_investigator_full_names,
			incedents.management_full_names,
		)
		.where(incedents.creation.between(filters.from_date, filters.to_date))
	)

	if filters.get("customer"):
		query = query.where(incedents.customer == filters.customer)

	if filters.get("model"):
		query = query.where(incedents.model_code == filters.model)

	if filters.get("brand"):
		query = query.where(incedents.brand == filters.brand)

	return query.run(as_dict=True)
