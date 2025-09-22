# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"label": _("Model Code"), "fieldname": "model", "fieldtype": "Data"},
		{"label": _("Model Description"), "fieldname": "description", "fieldtype": "Data"},
		{"label": _("Wholesale"), "fieldname": "wholesale", "fieldtype": "Int"},
		{"label": _("Retail"), "fieldname": "retail", "fieldtype": "Int"},
	]

	return columns


def get_data(filters):
	status_filter = ["Cancelled", "Finance Declined", "Pending", "Financial Approval Pending"]
	# Convert list to a comma-separated string for SQL IN clause
	status_filter_str = "', '".join(status_filter)

	query = f"""
    SELECT
        model,
        description,
        SUM(CASE WHEN status NOT IN ('{status_filter_str}') THEN 1 ELSE 0 END) AS wholesale,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS retail
    FROM `tabHead Office Vehicle Orders`
    WHERE docstatus != 2
    GROUP BY model, description
    HAVING
        SUM(CASE WHEN status NOT IN ('{status_filter_str}') THEN 1 ELSE 0 END) > 0
        OR SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) > 0
    """
	data = frappe.db.sql(query, as_dict=True)
	return data
