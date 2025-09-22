# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt


import frappe
from dateutil.relativedelta import relativedelta
from frappe import _


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Dealership"), "fieldname": "dealership", "fieldtype": "Data", "width": 150},
		{"label": _("Unique Customers"), "fieldname": "unique_customers", "fieldtype": "Int", "width": 150},
		{
			"label": _("Retained Customers"),
			"fieldname": "retained_customers",
			"fieldtype": "Int",
			"width": 150,
		},
		{"label": _("Retention Rate (%)"), "fieldname": "retention_rate", "fieldtype": "Float", "width": 150},
	]


def get_window(range_label):
	end_date = frappe.utils.getdate()
	months = int(range_label.split()[0])
	start_date = end_date - relativedelta(months=months)
	return start_date, end_date


def get_data(filters):
	start_date, end_date = get_window(filters["range"])

	sql = """
        WITH filtered_services AS (
            SELECT
                dealer AS dealership,
                customer,
                service_date
            FROM `tabVehicles Service`
            WHERE
                docstatus != 2
                AND service_date BETWEEN %(start)s AND %(end)s
        ),
        first_services AS (
            SELECT
                dealership,
                customer,
                MIN(service_date) AS first_service_date
            FROM filtered_services
            GROUP BY dealership, customer
        ),
        followup_flags AS (
            SELECT
                f.dealership,
                f.customer,
                CASE WHEN EXISTS (
                    SELECT 1
                    FROM filtered_services fs
                    WHERE
                        fs.dealership = f.dealership
                        AND fs.customer = f.customer
                        AND fs.service_date > f.first_service_date
                )
                THEN 1 ELSE 0 END AS did_return
            FROM first_services f
        )
        SELECT
            fs.dealership AS dealership,
            COUNT(*) AS unique_customers,
            SUM(ff.did_return) AS retained_customers,
            ROUND(SUM(ff.did_return) / COUNT(*) * 100, 2) AS retention_rate
        FROM first_services fs
        JOIN followup_flags ff
          ON fs.dealership = ff.dealership
         AND fs.customer   = ff.customer
        GROUP BY fs.dealership
        ORDER BY fs.dealership
    """

	return frappe.db.sql(sql, {"start": start_date, "end": end_date}, as_dict=True)
