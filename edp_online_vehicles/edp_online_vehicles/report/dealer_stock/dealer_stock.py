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
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data", "width": 120},
		{
			"label": _("VIN/ Serial No"),
			"fieldname": "vin_serial_no",
			"fieldtype": "Link",
			"options": "Vehicle Stock",
			"width": 120,
		},
		{"label": _("Engine No"), "fieldname": "engine_no", "fieldtype": "Data", "width": 120},
		{"label": _("Stock No"), "fieldname": "stock_no", "fieldtype": "Data", "width": 120},
		{
			"label": _("Alternative Stock No"),
			"fieldname": "alternative_stock_no",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Control No"), "fieldname": "control_no", "fieldtype": "Data", "width": 120},
		{"label": _("Fleet No"), "fieldname": "fleet_no", "fieldtype": "Data", "width": 120},
		{"label": _("Register No"), "fieldname": "register_no", "fieldtype": "Data", "width": 120},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 120},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 120},
		{"label": _("Description"), "fieldname": "description", "fieldtype": "Data", "width": 120},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 120},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 120},
		{
			"label": _("Last Load Test Date"),
			"fieldname": "last_load_test_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Next Load Test Date"),
			"fieldname": "next_load_test_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{"label": _("Type"), "fieldname": "type", "fieldtype": "Data", "width": 120},
		{"label": _("Operational Status"), "fieldname": "status", "fieldtype": "Data", "width": 120},
		{
			"label": _("Availablility Status"),
			"fieldname": "availability_status",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Condition"), "fieldname": "condition", "fieldtype": "Data", "width": 120},
		{"label": _("Current Hours"), "fieldname": "current_hours", "fieldtype": "Data", "width": 120},
		{"label": _("Current Location"), "fieldname": "current_location", "fieldtype": "Data", "width": 120},
		{
			"label": _("Cost Price (Excl)"),
			"fieldname": "cost_price_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Dealer Billing (Excl)"),
			"fieldname": "dealer_billing_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Suggested Retail (Excl)"),
			"fieldname": "suggested_retail_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{"label": _("HO Invoice No"), "fieldname": "ho_invoice_no", "fieldtype": "Data", "width": 120},
		{"label": _("HO Invoice Amt"), "fieldname": "ho_invoice_amt", "fieldtype": "Currency", "width": 120},
		{"label": _("HO Invoice Date"), "fieldname": "ho_invoice_date", "fieldtype": "Date", "width": 120},
		{
			"label": _("Rental Amt (Excl)"),
			"fieldname": "rental_amt_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{"label": _("Amt Paid"), "fieldname": "amt_paid", "fieldtype": "Currency", "width": 120},
		{"label": _("Date Paid"), "fieldname": "date_paid", "fieldtype": "Date", "width": 120},
		{"label": _("Vessel Name"), "fieldname": "vessel_name", "fieldtype": "Data", "width": 120},
		{"label": _("Target Warehouse"), "fieldname": "target_warehouse", "fieldtype": "Data", "width": 120},
		{"label": _("ETA Harbour"), "fieldname": "eta_harbour", "fieldtype": "Date", "width": 120},
		{"label": _("ETA Warehouse"), "fieldname": "eta_warehouse", "fieldtype": "Data", "width": 120},
		{"label": _("HO Date Received"), "fieldname": "ho_date_received", "fieldtype": "Date", "width": 120},
		{"label": _("Contract No"), "fieldname": "contract_no", "fieldtype": "Data", "width": 120},
		{"label": _("Contract Status"), "fieldname": "contract_status", "fieldtype": "Data", "width": 120},
		{
			"label": _("Contract Start Date"),
			"fieldname": "contract_start_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Contract End Date"),
			"fieldname": "contract_end_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 120},
		{
			"label": _("Customer Full Name"),
			"fieldname": "customer_full_name",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Phone"), "fieldname": "phone", "fieldtype": "Data", "width": 120},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 120},
		{"label": _("Address"), "fieldname": "address", "fieldtype": "Small Text", "width": 120},
		{
			"label": _("Warranty Period (Years)"),
			"fieldname": "warranty_period_years",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Warranty KM/ Hours Limit"),
			"fieldname": "warranty_km_hours_limit",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Warranty Start Date"),
			"fieldname": "warranty_start_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Warranty End Date"),
			"fieldname": "warranty_end_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Service Period (Years)"),
			"fieldname": "service_period_years",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Service KM/ Hours Limit"),
			"fieldname": "service_km_hours_limit",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Last Service Hours"),
			"fieldname": "last_service_hours",
			"fieldtype": "Float",
			"width": 120,
		},
		{
			"label": _("Last Service Date"),
			"fieldname": "last_service_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Next Service Due Date"),
			"fieldname": "next_service_due_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"label": _("Service Start Date"),
			"fieldname": "service_start_date",
			"fieldtype": "Date",
			"width": 120,
		},
		{"label": _("Service End Date"), "fieldname": "service_end_date", "fieldtype": "Date", "width": 120},
		{"label": _("Registration No"), "fieldname": "registration_no", "fieldtype": "Data", "width": 120},
	]

	return columns


def get_data(filters):
	data = []

	stock = DocType("Vehicle Stock")

	query = frappe.qb.from_(stock).select(
		stock.vin_serial_no,
		stock.engine_no,
		stock.stock_no,
		stock.alternative_stock_no,
		stock.control_no,
		stock.fleet_no,
		stock.register_no,
		stock.brand,
		stock.model,
		stock.description,
		stock.colour,
		stock.model_year,
		stock.last_load_test_date,
		stock.next_load_test_date,
		stock.dealer,
		stock.type,
		stock.status,
		stock.availability_status,
		stock.condition,
		stock.current_hours,
		stock.current_location,
		stock.cost_price_excl,
		stock.dealer_billing_excl,
		stock.suggested_retail_excl,
		stock.ho_invoice_no,
		stock.ho_invoice_amt,
		stock.ho_invoice_date,
		stock.rental_amt_excl,
		stock.amt_paid,
		stock.date_paid,
		stock.vessel_name,
		stock.target_warehouse,
		stock.eta_harbour,
		stock.eta_warehouse,
		stock.ho_date_received,
		stock.contract_no,
		stock.contract_status,
		stock.contract_start_date,
		stock.contract_end_date,
		stock.customer,
		stock.customer_full_name,
		stock.phone,
		stock.email,
		stock.address,
		stock.warranty_period_years,
		stock.warranty_km_hours_limit,
		stock.warranty_start_date,
		stock.warranty_end_date,
		stock.service_period_years,
		stock.service_km_hours_limit,
		stock.last_service_hours,
		stock.last_service_date,
		stock.next_service_due_date,
		stock.service_start_date,
		stock.service_end_date,
		stock.registration_no,
	)

	if not filters.get("show_dealer_full_stock_report"):
		query = query.where(stock.dealer == filters.get("dealer"))

	if filters.get("availability_status"):
		query = query.where(stock.availability_status == filters.availability_status)
	else:
		query = query.where(stock.availability_status.isin(["Available", "Reserved"]))

	result = query.run(as_dict=True)

	for row in result:
		paid = row["date_paid"]

		if (paid is None) and (paid == ""):
			row["paid"] = "T"
		else:
			row["paid"] = "F"

		data.append(row)

	return data
