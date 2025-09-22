# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.utils import add_months, get_datetime, today


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("VIN/Serial No"),
			"fieldname": "vin_serial_no",
			"fieldtype": "Link",
			"options": "Vehicle Stock",
			"width": 150,
		},
		{
			"label": _("Last Service Date"),
			"fieldname": "last_service_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{"label": _("Customer ID"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{
			"label": _("Last Service ID"),
			"fieldname": "last_service_id",
			"fieldtype": "Link",
			"options": "Vehicles Service",
			"width": 150,
		},
		{
			"label": _("Last Service Technician"),
			"fieldname": "last_service_technician",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Last Service Status"),
			"fieldname": "last_service_status",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	DocType("Vehicle Stock")

	# Get the current date
	current_date = get_datetime(today())

	# Map the selected date range to the number of months
	date_range_mapping = {"6 Months": 6, "12 Months": 12, "18 Months": 18, "24 Months": 24}

	# Get the number of months from the selected date range filter
	selected_date_range = filters.get("date_range")
	months_filter = date_range_mapping.get(selected_date_range, 6)  # Default to 6 months if no filter

	# Calculate the date threshold based on the selected date range
	overdue_date_threshold = add_months(current_date, -months_filter)

	# SQL subquery to get the last service date per vin_serial_no
	subquery = """
        SELECT
            vinserial_no,
            MAX(service_date) AS last_service_date
        FROM `tabVehicles Service`
        GROUP BY vinserial_no
    """

	# Main query to get the last service details per VIN, including VINs without a service record
	query = f"""
        SELECT
            stock.vin_serial_no AS vin_serial_no,
            COALESCE(subquery.last_service_date, '') AS last_service_date,
            service.name AS last_service_id,
            CASE
                WHEN service.customer IS NOT NULL THEN service.customer
                ELSE stock.customer
            END AS customer,
            CASE
                WHEN service.customer_name IS NOT NULL THEN service.customer_name
                ELSE customer.customer_name
            END AS customer_name,
            service.technician_full_names AS last_service_technician,
            service.service_status AS last_service_status
        FROM `tabVehicle Stock` stock
        LEFT JOIN ({subquery}) subquery
        ON subquery.vinserial_no = stock.vin_serial_no
        LEFT JOIN `tabVehicles Service` service
        ON service.vinserial_no = subquery.vinserial_no
        AND service.service_date = subquery.last_service_date
        LEFT JOIN `tabCustomer` customer
        ON stock.customer = customer.name
        WHERE subquery.last_service_date < '{overdue_date_threshold}' OR subquery.last_service_date IS NULL
        ORDER BY subquery.last_service_date DESC
    """

	# Execute the raw SQL query
	data = frappe.db.sql(query, as_dict=True)

	return data
