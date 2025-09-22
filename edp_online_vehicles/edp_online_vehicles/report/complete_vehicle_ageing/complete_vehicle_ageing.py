# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import datetime

import frappe
from frappe import _
from frappe.utils import getdate, today


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	chart = get_chart_data(data)
	return columns, data, None, chart


def get_columns():
	columns = [
		{
			"label": _("VIN/Serial No"),
			"fieldname": "vin_serial_no",
			"fieldtype": "Link",
			"options": "Vehicle Stock",
			"width": 250,
		},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "description",
			"fieldtype": "Data",
		},
		{
			"label": _("Category"),
			"fieldname": "category",
			"fieldtype": "Data",
		},
		{
			"label": _("Brand"),
			"fieldname": "brand",
			"fieldtype": "Data",
		},
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
	hq_company = frappe.get_all("Company", filters={"custom_head_office": 1}, pluck="name")

	hq_warehouses = frappe.get_all("Warehouse", filters={"company": ["in", hq_company]}, fields=["name"])
	hq_warehouse_list = [warehouse["name"] for warehouse in hq_warehouses]

	# Fetch Equipment Stock records based on filters
	conditions = {}
	if filters.get("availability_status") and filters.get("availability_status") != "All":
		conditions["availability_status"] = filters.get("availability_status")
	if filters.get("vin_serial_no"):
		conditions["vin_serial_no"] = filters.get("vin_serial_no")
	if filters.get("model"):
		conditions["model"] = filters.get("model")
	if filters.get("catagory"):
		conditions["catagory"] = filters.get("catagory")
	if filters.get("brand"):
		conditions["brand"] = filters.get("brand")

	equipment_stocks = frappe.get_all(
		"Vehicle Stock",
		filters=conditions,
		fields=["vin_serial_no", "model", "description", "catagory", "brand"],
	)

	# Fetch related Stock Entry and Stock Entry Detail data
	vin_serial_numbers = [stock["vin_serial_no"] for stock in equipment_stocks]
	stock_entries = frappe.get_all(
		"Stock Entry Detail",
		filters={"serial_no": ["in", vin_serial_numbers]},
		fields=["parent", "serial_no", "t_warehouse", "s_warehouse"],
	)

	stock_entry_details = frappe.get_all(
		"Stock Entry",
		filters={"name": ["in", [entry["parent"] for entry in stock_entries]], "docstatus": 1},
		fields=["name", "posting_date", "posting_time", "stock_entry_type"],
		order_by="posting_date asc, posting_time asc",
	)

	# Filter out Equipment Stocks without Stock Entry data
	valid_vins = {entry["serial_no"] for entry in stock_entries}
	equipment_stocks = [stock for stock in equipment_stocks if stock["vin_serial_no"] in valid_vins]

	# Build a mapping of VIN/Serial No to associated stock entry data
	stock_data = {}
	for entry in stock_entries:
		vin = entry["serial_no"]
		if vin not in stock_data:
			stock_data[vin] = []
		stock_data[vin].append(
			{
				"t_warehouse": entry["t_warehouse"],
				"s_warehouse": entry["s_warehouse"],
				"posting_date": next(
					(se["posting_date"] for se in stock_entry_details if se["name"] == entry["parent"]), None
				),
				"posting_time": next(
					(se["posting_time"] for se in stock_entry_details if se["name"] == entry["parent"]), None
				),
				"stock_entry_type": next(
					(se["stock_entry_type"] for se in stock_entry_details if se["name"] == entry["parent"]),
					None,
				),
			}
		)

	# Process data to calculate ages
	result = []
	current_date = getdate(today())

	for stock in equipment_stocks:
		vin = stock["vin_serial_no"]
		data = stock_data.get(vin, [])
		# Sort data by posting_date and posting_time
		data = sorted(
			data, key=lambda x: (x["posting_date"] or datetime.date.min, x.get("posting_time", "00:00:00"))
		)
		total_age, hq_warehouse_age, hq_transit_age, dealer_age = calculate_ages(
			data, current_date, hq_warehouse_list, hq_company
		)
		stock.update(
			{
				"total_age": total_age,
				"hq_warehouse_age": hq_warehouse_age,
				"hq_transit_age": hq_transit_age,
				"dealer_age": dealer_age,
			}
		)
		result.append(stock)

	# Order the result based on the 'model' field
	result = sorted(result, key=lambda x: x["model"])

	return result


def calculate_ages(data, current_date, hq_warehouse_list, hq_company_list):
	total_age = hq_warehouse_age = hq_transit_age = dealer_age = 0

	# Initialize dates for calculations
	first_hq_received_date = None
	second_dealer_received_date = None
	last_issue_date = None
	last_receipt_date = None
	transit_start_date = None

	company = hq_company_list[0]

	# Fetch company abbreviation to dynamically build the 'Goods In Transit' warehouse name
	company_abbreviation = frappe.get_value("Company", filters={"name": company}, fieldname="abbr")
	if not company_abbreviation:
		company_abbreviation = ""  # Default empty if no abbreviation is found

	goods_in_transit_warehouse_name = f"Goods In Transit - {company_abbreviation}"

	for entry in data:
		posting_date = getdate(entry["posting_date"])
		stock_entry_type = entry["stock_entry_type"]
		t_warehouse = entry["t_warehouse"]
		entry["s_warehouse"]

		# Material Receipt
		if stock_entry_type == "Material Receipt":
			if t_warehouse in hq_warehouse_list and not first_hq_received_date:
				first_hq_received_date = posting_date
			elif t_warehouse not in hq_warehouse_list and not second_dealer_received_date:
				second_dealer_received_date = posting_date
			elif t_warehouse not in hq_warehouse_list and (
				not last_receipt_date or posting_date > last_receipt_date
			):
				last_receipt_date = posting_date

		# Material Issue
		elif stock_entry_type == "Material Issue":
			if not last_issue_date or posting_date > last_issue_date:
				last_issue_date = posting_date

		# Material Transfer
		elif stock_entry_type == "Material Transfer":
			# Identify if this transfer is to the "Goods In Transit" warehouse
			if t_warehouse == goods_in_transit_warehouse_name:
				transit_start_date = posting_date

	# Calculate total age
	if first_hq_received_date:
		# Use the later of last issue date or last receipt date, or fallback to today
		effective_end_date = max(last_issue_date or current_date, last_receipt_date or current_date)
		total_age = (effective_end_date - first_hq_received_date).days

	# Calculate HQ warehouse age
	if first_hq_received_date and second_dealer_received_date:
		if first_hq_received_date == second_dealer_received_date:
			hq_warehouse_age = 1
		else:
			hq_warehouse_age = (second_dealer_received_date - first_hq_received_date).days
	elif first_hq_received_date:
		hq_warehouse_age = (current_date - first_hq_received_date).days

	# Calculate in-transit age
	if (
		transit_start_date
		and second_dealer_received_date
		and (transit_start_date < second_dealer_received_date)
	):
		hq_transit_age = (second_dealer_received_date - transit_start_date).days
		frappe.msgprint(str(hq_transit_age))
	elif transit_start_date:
		hq_transit_age = (current_date - transit_start_date).days

	# Calculate dealer age
	if second_dealer_received_date:
		# Use last_receipt_date or current_date as a fallback if last_issue_date exists
		effective_last_receipt_date = last_receipt_date if last_receipt_date else current_date

		# If last issue date exists and is earlier than the last receipt date, use today's date
		if last_issue_date and last_issue_date < effective_last_receipt_date:
			end_date = current_date
		else:
			# Otherwise, use the last issue date or fallback to current_date
			end_date = last_issue_date if last_issue_date else current_date

		dealer_age = (end_date - second_dealer_received_date).days

	return total_age, hq_warehouse_age, hq_transit_age, dealer_age


def get_chart_data(data):
	model_age_totals = {}
	model_vehicle_counts = {}

	# Calculate total age and count of vehicles per model
	for row in data:
		model = row.get("model")
		total_age = row.get("total_age", 0)
		if model:
			model_age_totals[model] = model_age_totals.get(model, 0) + total_age
			model_vehicle_counts[model] = model_vehicle_counts.get(model, 0) + 1

	# Calculate average age for each model and round to 2 decimal places
	average_ages = {
		model: round(model_age_totals[model] / model_vehicle_counts[model], 2) for model in model_age_totals
	}

	labels = list(average_ages.keys())
	values = list(average_ages.values())

	return {
		"data": {"labels": labels, "datasets": [{"name": _("Average Age"), "values": values}]},
		"type": "bar",
		"title": _("Average Age by Model"),
	}
