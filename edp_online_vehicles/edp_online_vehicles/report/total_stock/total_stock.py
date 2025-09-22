# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import datetime

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.utils import getdate, today


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
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
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data", "width": 120},
		{"label": _("Type"), "fieldname": "type", "fieldtype": "Data", "width": 120},
		{"label": _("Operational Status"), "fieldname": "status", "fieldtype": "Data", "width": 120},
		{
			"label": _("Availablility Status"),
			"fieldname": "availability_status",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Condition"), "fieldname": "condition", "fieldtype": "Data", "width": 120},
		{"label": _("Current Location"), "fieldname": "current_location", "fieldtype": "Data", "width": 120},
		{"label": _("HO Invoice No"), "fieldname": "ho_invoice_no", "fieldtype": "Data", "width": 120},
		{"label": _("HO Invoice Amt"), "fieldname": "ho_invoice_amt", "fieldtype": "Currency", "width": 120},
		{"label": _("HO Invoice Date"), "fieldname": "ho_invoice_date", "fieldtype": "Date", "width": 120},
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
		{
			"label": _("Total Age"),
			"fieldname": "total_age",
			"fieldtype": "Int",
		},
		{
			"label": _("HQ Warehouse Age"),
			"fieldname": "hq_warehouse_age",
			"fieldtype": "Int",
		},
		{
			"label": _("HQ Transit Age"),
			"fieldname": "hq_transit_age",
			"fieldtype": "Int",
		},
		{
			"label": _("Dealer Age"),
			"fieldname": "dealer_age",
			"fieldtype": "Int",
		},
	]

	return columns


def get_data(filters):
	stock = DocType("Vehicle Stock")
	# Exclude age fields when selecting
	exclude_fields = ["total_age", "hq_warehouse_age", "hq_transit_age", "dealer_age"]
	# Build select fields dynamically
	select_fields = []
	for col in get_columns():
		fname = col["fieldname"]
		if fname not in exclude_fields:
			select_fields.append(getattr(stock, fname))

	query = frappe.qb.from_(stock).select(*select_fields).where(stock.dealer == filters.dealer)

	# apply filters
	if filters.get("customer"):
		query = query.where(stock.customer == filters.customer)
	if filters.get("brand"):
		query = query.where(stock.brand == filters.brand)
	if filters.get("model"):
		query = query.where(stock.model == filters.model)
	if filters.get("type"):
		query = query.where(stock.type == filters.type)
	if filters.get("availability_status"):
		query = query.where(stock.availability_status == filters.availability_status)
	else:
		query = query.where(stock.availability_status.isin(["Available", "Reserved"]))

	rows = query.run(as_dict=True)

	# Compute ageing data for VINs in rows
	vin_list = [row["vin_serial_no"] for row in rows]
	age_map = fetch_age_data(filters, vin_list)

	# Merge age data into each row
	for row in rows:
		ages = age_map.get(row["vin_serial_no"], {})
		row.update(
			{
				"total_age": ages.get("total_age", 0),
				"hq_warehouse_age": ages.get("hq_warehouse_age", 0),
				"hq_transit_age": ages.get("hq_transit_age", 0),
				"dealer_age": ages.get("dealer_age", 0),
			}
		)

	# Sort by model
	rows.sort(key=lambda x: x.get("model") or "")
	return rows


def fetch_age_data(filters, vin_list):
	# Identify HQ company and warehouses
	hq_company = frappe.get_all("Company", filters={"custom_head_office": 1}, pluck="name") or []
	hq_warehouses = frappe.get_all("Warehouse", filters={"company": ["in", hq_company]}, pluck="name")

	# Determine Goods In Transit warehouse name dynamically
	company_abbr = frappe.get_value("Company", {"name": hq_company[0] if hq_company else ""}, "abbr") or ""
	f"Goods In Transit - {company_abbr}"

	# Fetch Stock Entry Detail records
	se_details = frappe.get_all(
		"Stock Entry Detail",
		filters={"serial_no": ["in", vin_list]},
		fields=["parent", "serial_no", "t_warehouse", "s_warehouse"],
	)
	se_parents = list({d["parent"] for d in se_details})

	# Fetch Stock Entry headers
	se = frappe.get_all(
		"Stock Entry",
		filters={"name": ["in", se_parents], "docstatus": 1},
		fields=["name", "posting_date", "posting_time", "stock_entry_type"],
	)

	# Organize details by VIN
	data_map = {}
	for d in se_details:
		vin = d["serial_no"]
		recs = data_map.setdefault(vin, [])
		header = next((h for h in se if h["name"] == d["parent"]), {})
		recs.append(
			{
				"t_warehouse": d["t_warehouse"],
				"s_warehouse": d["s_warehouse"],
				"posting_date": getdate(header.get("posting_date")),
				"posting_time": header.get("posting_time"),
				"stock_entry_type": header.get("stock_entry_type"),
			}
		)

	current_date = getdate(today())
	age_map = {}
	for vin, entries in data_map.items():
		entries.sort(key=lambda x: (x["posting_date"] or datetime.date.min, x.get("posting_time", "")))
		total, hq_age, transit_age, dealer_age = calculate_ages(
			entries, current_date, hq_warehouses, hq_company
		)
		age_map[vin] = {
			"total_age": total,
			"hq_warehouse_age": hq_age,
			"hq_transit_age": transit_age,
			"dealer_age": dealer_age,
		}
	return age_map


def calculate_ages(data, current_date, hq_warehouse_list, hq_company_list):
	# Initialize age metrics
	total_age = hq_warehouse_age = hq_transit_age = dealer_age = 0
	first_hq_date = second_dealer_date = last_receipt = last_issue = transit_start = None

	company = hq_company_list[0] if hq_company_list else ""
	company_abbr = frappe.get_value("Company", {"name": company}, "abbr") or ""
	transit_wh = f"Goods In Transit - {company_abbr}"

	for e in data:
		pd = e["posting_date"]
		stype = e["stock_entry_type"]
		tw = e["t_warehouse"]
		if stype == "Material Receipt":
			if tw in hq_warehouse_list and not first_hq_date:
				first_hq_date = pd
			elif tw not in hq_warehouse_list and not second_dealer_date:
				second_dealer_date = pd
			elif tw not in hq_warehouse_list and (not last_receipt or pd > last_receipt):
				last_receipt = pd
		elif stype == "Material Issue":
			if not last_issue or pd > last_issue:
				last_issue = pd
		elif stype == "Material Transfer" and tw == transit_wh:
			if not transit_start:
				transit_start = pd

	if first_hq_date:
		effective_end = max(last_issue or current_date, last_receipt or current_date)
		total_age = (effective_end - first_hq_date).days

	if first_hq_date and second_dealer_date:
		hq_warehouse_age = (second_dealer_date - first_hq_date).days or 1
	elif first_hq_date:
		hq_warehouse_age = (current_date - first_hq_date).days

	if transit_start and second_dealer_date and transit_start < second_dealer_date:
		hq_transit_age = (second_dealer_date - transit_start).days
	elif transit_start:
		hq_transit_age = (current_date - transit_start).days

	if second_dealer_date:
		eff_end = last_receipt or current_date
		if last_issue and last_issue < eff_end:
			end = current_date
		else:
			end = last_issue or current_date
		dealer_age = (end - second_dealer_date).days

	return total_age, hq_warehouse_age, hq_transit_age, dealer_age
