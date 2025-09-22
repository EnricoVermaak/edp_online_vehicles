# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	total_box_qty = sum(row["total_box_qty"] for row in data)
	total_checked_qty = sum(row["total_checked_qty"] for row in data)
	total_delivered_qty = sum(row["total_delivered_qty"] for row in data)
	total_return = sum(row["total_return"] for row in data)
	total_weight = sum(row["total_weight"] for row in data)

	# Get the total number of unique customers
	total_customers_data = get_total_customers(filters)

	# Extract the total customers from the query result
	total_customers = total_customers_data[0].get("total_customers", 0) if total_customers_data else 0

	print(total_customers)  # Optional: For debugging purposes

	total_row = {
		"customer": _("Total"),
		"custom_customer_name": total_customers,
		"total_box_qty": total_box_qty,
		"total_checked_qty": total_checked_qty,
		"total_delivered_qty": total_delivered_qty,
		"total_return": total_return,
		"total_weight": total_weight,
	}

	data.append(total_row)

	return columns, data


def get_columns():
	columns = [
		{"label": _("Customer No"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "custom_customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Total Box Qty"), "fieldname": "total_box_qty", "fieldtype": "Data", "width": 150},
		{
			"label": _("Total Checked Qty"),
			"fieldname": "total_checked_qty",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Total Delivered Qty"),
			"fieldname": "total_delivered_qty",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Total Return"), "fieldname": "total_return", "fieldtype": "Data", "width": 150},
		{"label": _("Total Weight"), "fieldname": "total_weight", "fieldtype": "Data", "width": 150},
		{
			"label": _("Parent Territory"),
			"fieldname": "custom_parent_territory",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Territory"), "fieldname": "custom_territory", "fieldtype": "Data", "width": 150},
	]

	return columns


def get_data(filters):
	excluded_customers = ["CCLD", "CCLVD", "CCLVC", "CCLMASSD"]

	# Subquery to fetch the latest Delivery Stop for each customer
	latest_territory_data = frappe.db.sql(
		"""
        SELECT
            sub.customer,
            ds.custom_parent_territory AS latest_parent_territory,
            ds.custom_territory AS latest_territory
        FROM
            `tabDelivery Stop` ds
        INNER JOIN (
            SELECT
                customer,
                MAX(dt.custom_delivery_date) AS latest_delivery_date
            FROM
                `tabDelivery Stop` ds
            LEFT JOIN
                `tabDelivery Trip` dt ON ds.parent = dt.name
            WHERE
                dt.custom_delivery_date BETWEEN %(delivery_from_date)s AND %(delivery_to_date)s
                AND dt.docstatus != 2
                AND ds.customer NOT IN %(excluded_customers)s
            GROUP BY
                ds.customer
        ) sub ON ds.customer = sub.customer
        LEFT JOIN
            `tabDelivery Trip` dt ON ds.parent = dt.name
        WHERE
            dt.custom_delivery_date = sub.latest_delivery_date
    """,
		{
			"delivery_from_date": filters.get("delivery_from_date"),
			"delivery_to_date": filters.get("delivery_to_date"),
			"excluded_customers": tuple(excluded_customers),
		},
		as_dict=True,
	)

	# Convert the subquery result to a dictionary for quick lookup
	latest_territory_dict = {row["customer"]: row for row in latest_territory_data}

	# Main query to fetch report data
	data = frappe.db.sql(
		"""
        SELECT
            ds.customer,
            ds.custom_customer_name,
            SUM(ds.custom_inv_qty) AS total_box_qty,
            SUM(ds.custom_checked_qty) AS total_checked_qty,
            SUM(ds.custom_delivered_qty) AS total_delivered_qty,
            SUM(ds.custom_return_) AS total_return,
            SUM(ds.custom_weight) AS total_weight
        FROM
            `tabDelivery Stop` ds
        LEFT JOIN
            `tabDelivery Trip` dt ON ds.parent = dt.name
        WHERE
            dt.custom_delivery_date BETWEEN %(delivery_from_date)s AND %(delivery_to_date)s
            AND dt.docstatus != 2
            AND ds.customer NOT IN %(excluded_customers)s
        GROUP BY
            ds.customer, ds.custom_customer_name
    """,
		{
			"delivery_from_date": filters.get("delivery_from_date"),
			"delivery_to_date": filters.get("delivery_to_date"),
			"excluded_customers": tuple(excluded_customers),
		},
		as_dict=True,
	)

	# Add latest territory and parent territory to the result
	for row in data:
		customer = row["customer"]
		if customer in latest_territory_dict:
			row["custom_territory"] = latest_territory_dict[customer]["latest_territory"]
			row["custom_parent_territory"] = latest_territory_dict[customer]["latest_parent_territory"]
		else:
			row["custom_territory"] = None
			row["custom_parent_territory"] = None

	return data


def get_total_customers(filters):
	data = frappe.db.sql(
		"""
			SELECT
				COUNT(DISTINCT ds.customer) AS total_customers
			FROM
				`tabDelivery Stop` ds
			LEFT JOIN
				`tabDelivery Trip` dt ON ds.parent = dt.name
			WHERE
				dt.docstatus != 2
				AND dt.custom_delivery_date BETWEEN %(delivery_from_date)s AND %(delivery_to_date)s
				AND ds.customer NOT IN ('CCLD', 'CCLVD', 'CCLVC', 'CCLMASSD')
		""",
		{
			"delivery_from_date": filters.get("delivery_from_date"),
			"delivery_to_date": filters.get("delivery_to_date"),
		},
		as_dict=True,
	)

	return data
