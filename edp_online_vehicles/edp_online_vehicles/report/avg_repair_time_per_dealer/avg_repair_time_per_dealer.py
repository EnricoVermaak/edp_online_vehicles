# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data", "width": 150},
		{
			"label": _("Avg. Repair Time (Hours)"),
			"fieldname": "avg_repair_time",
			"fieldtype": "Int",
			"width": 200,
		},
	]

	return columns


def get_data(filters):
	query = """
        SELECT
            dealer,
            AVG(TIMESTAMPDIFF(SECOND, start_date, end_date)) / 3600 AS avg_repair_time
        FROM `tabVehicles Service`
        WHERE service_completed IS NOT NULL
        GROUP BY dealer
    """
	data = frappe.db.sql(query, as_dict=1)
	return data
