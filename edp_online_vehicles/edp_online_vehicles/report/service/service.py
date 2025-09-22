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
			"fieldname": "vinserial_no",
			"label": _("Vehicles VIN No/ Serial No"),
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "model", "label": _("Model"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "odo_reading_hours",
			"label": _("Odo Reading/ Hours"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "schedule_date",
			"label": _("Requested Booking Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "service_date", "label": _("Service Date"), "fieldtype": "Date", "width": 120},
		{
			"fieldname": "service_completed",
			"label": _("Service Completed Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "customer", "label": _("Customer"), "fieldtype": "Data", "width": 120},
		{"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "current_location", "label": _("Current Location"), "fieldtype": "Data", "width": 120},
		{"fieldname": "price_list", "label": _("Price List"), "fieldtype": "Data", "width": 120},
		{"fieldname": "service_type", "label": _("Service Type"), "fieldtype": "Data", "width": 120},
		{"fieldname": "service_status", "label": _("Status"), "fieldtype": "Data", "width": 120},
		{"fieldname": "transferred", "label": _("Transferred"), "fieldtype": "Check", "width": 60},
		{
			"fieldname": "added_to_sales_order",
			"label": _("Added to Sales Order"),
			"fieldtype": "Check",
			"width": 120,
		},
		{"fieldname": "engine_no", "label": _("Engine No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "brand", "label": _("Brand"), "fieldtype": "Data", "width": 120},
		{"fieldname": "licence_no", "label": _("Licence No"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "licence_expiry_date",
			"label": _("Licence Expiry Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "colour", "label": _("Colour"), "fieldtype": "Data", "width": 120},
		{"fieldname": "model_year", "label": _("Model Year"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "bought_from_dealer",
			"label": _("Bought From Dealer"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "warranty_start_date",
			"label": _("Warranty Start Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "warranty_end_date",
			"label": _("Warranty End Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "warranty_period_years",
			"label": _("Warranty Period (Years)"),
			"fieldtype": "Int",
			"width": 120,
		},
		{"fieldname": "job_card_no", "label": _("Job Card No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "dms_approval_no", "label": _("DMS Approval No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "dealer", "label": _("Dealer"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "service_start_date",
			"label": _("Service Start Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "service_end_date", "label": _("Service End Date"), "fieldtype": "Date", "width": 120},
		{"fieldname": "service_period", "label": _("Service Period"), "fieldtype": "Int", "width": 120},
		{
			"fieldname": "parts_total_excl",
			"label": _("Parts Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{"fieldname": "duration_total", "label": _("Duration Total"), "fieldtype": "Int", "width": 120},
		{
			"fieldname": "labours_total_excl",
			"label": _("Labours Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"fieldname": "extra_cost_total_excl",
			"label": _("Extra Cost Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"fieldname": "technician_full_names",
			"label": _("Technician Full Names"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "customer_full_names",
			"label": _("Customer Conformation Full Names"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "authorised_by_full_names",
			"label": _("Authorised By Full Names"),
			"fieldtype": "Data",
			"width": 120,
		},
	]
	return columns


def get_data(filters):
	services = frappe.qb.DocType("Vehicles Service")

	query = (
		frappe.qb.from_(services)
		.select(
			services.vinserial_no,
			services.model,
			services.odo_reading_hours,
			services.schedule_date,
			services.service_date,
			services.service_completed,
			services.customer,
			services.customer_name,
			services.current_location,
			services.price_list,
			services.service_type,
			services.service_status,
			services.transferred,
			services.added_to_sales_order,
			services.engine_no,
			services.brand,
			services.licence_no,
			services.licence_expiry_date,
			services.colour,
			services.model_year,
			services.bought_from_dealer,
			services.warranty_start_date,
			services.warranty_end_date,
			services.warranty_period_years,
			services.job_card_no,
			services.dms_approval_no,
			services.dealer,
			services.service_start_date,
			services.service_end_date,
			services.service_period,
			services.parts_total_excl,
			services.duration_total,
			services.labours_total_excl,
			services.extra_cost_total_excl,
			services.technician_full_names,
			services.customer_full_names,
			services.authorised_by_full_names,
			services.amended_from,
		)
		.where(
			Date(services.creation).between(filters.from_date, filters.to_date)
			& (services.dealer == filters.dealer)
		)
	)

	if filters.get("vinserial_no"):
		query = query.where(services.vinserial_no == filters.get("vinserial_no"))

	if filters.get("customer"):
		query = query.where(services.customer == filters.get("customer"))

	if filters.get("current_location"):
		query = query.where(services.current_location == filters.get("current_location"))

	if filters.get("service_type"):
		query = query.where(services.service_type == filters.get("service_type"))

	if filters.get("status"):
		query = query.where(services.status == filters.get("status"))

	return query.run(as_dict=1)
