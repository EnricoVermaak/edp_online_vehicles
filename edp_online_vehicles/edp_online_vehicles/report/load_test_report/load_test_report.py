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
		{
			"fieldname": "name",
			"label": _("Document ID"),
			"fieldtype": "Link",
			"options": "Vehicles Load Test",
			"width": 120,
		},
		{"fieldname": "vin_serial_no", "label": _("VIN/Serial No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "customer", "label": _("Customer"), "fieldtype": "Data", "width": 120},
		{"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "current_location", "label": _("Current Location"), "fieldtype": "Data", "width": 120},
		{"fieldname": "dealer", "label": _("Dealer"), "fieldtype": "Data", "width": 120},
		{"fieldname": "hour_meter", "label": _("Odo Reading / Hours"), "fieldtype": "Data", "width": 120},
		{"fieldname": "tested_on", "label": _("Tested On"), "fieldtype": "Data", "width": 120},
		{"fieldname": "tested_by", "label": _("Tested By"), "fieldtype": "Data", "width": 120},
		{"fieldname": "lt_status", "label": _("LT Status"), "fieldtype": "Data", "width": 120},
		{"fieldname": "load_tested_at", "label": _("Load Tested At(%)"), "fieldtype": "Data", "width": 120},
		{"fieldname": "next_load_test", "label": _("Next Load Test Date"), "fieldtype": "Date", "width": 120},
		{
			"fieldname": "requested_booking_date",
			"label": _("Requested Booking Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "booking_date", "label": _("Booking Date"), "fieldtype": "Date", "width": 120},
		{
			"fieldname": "model_description",
			"label": _("Model Description"),
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "model_year", "label": _("Model Year"), "fieldtype": "Data", "width": 120},
		{"fieldname": "brand", "label": _("Brand"), "fieldtype": "Data", "width": 120},
		{"fieldname": "model", "label": _("Model"), "fieldtype": "Data", "width": 120},
		{"fieldname": "forks_serial_no", "label": _("Forks Description"), "fieldtype": "Data", "width": 120},
		{"fieldname": "mast_model_mm", "label": _("Mast Model (MM)"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "standard_capacity",
			"label": _("Standard Capacity"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "rated_capacity_kg",
			"label": _("Rated Capacity (KG)"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "next_inspection_date",
			"label": _("Next Inspection Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "required_load_test_pass_rate",
			"label": _("Required Load Test Pass Rate"),
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "load_test_at", "label": _("Testing Pass Rate"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "tested_by_full_name",
			"label": _("Tested By Full Name"),
			"fieldtype": "Data",
			"width": 120,
		},
	]
	return columns


def get_data(filters):
	load_test = frappe.qb.DocType("Vehicles Load Test")

	query = (
		frappe.qb.from_(load_test)
		.select(
			load_test.name,
			load_test.vin_serial_no,
			load_test.customer,
			load_test.customer_name,
			load_test.current_location,
			load_test.dealer,
			load_test.hour_meter,
			load_test.tested_on,
			load_test.tested_by,
			load_test.lt_status,
			load_test.load_tested_at,
			load_test.next_load_test,
			load_test.requested_booking_date,
			load_test.booking_date,
			load_test.model_description,
			load_test.model_year,
			load_test.brand,
			load_test.model,
			load_test.forks_serial_no,
			load_test.mast_model_mm,
			load_test.standard_capacity,
			load_test.rated_capacity_kg,
			load_test.next_inspection_date,
			load_test.required_load_test_pass_rate,
			load_test.load_test_at,
			load_test.tested_by_full_name,
		)
		.where(
			Date(load_test.creation).between(filters.from_date, filters.to_date)
			& (load_test.dealer == filters.dealer)
		)
	)

	if filters.get("vin_serial_no"):
		query = query.where(load_test.vin_serial_no == filters.get("vin_serial_no"))

	if filters.get("customer"):
		query = query.where(load_test.customer == filters.get("customer"))

	if filters.get("tested_by"):
		query = query.where(load_test.tested_by == filters.get("tested_by"))

	if filters.get("model"):
		query = query.where(load_test.model == filters.get("model"))

	return query.run(as_dict=1)
