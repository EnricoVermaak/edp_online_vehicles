# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType, Field


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
		{"label": _("Invoice Number"), "fieldname": "inv_num", "fieldtype": "Data", "width": 150},
		{
			"label": _("Dropshipment Customer No"),
			"fieldname": "custom_dropshipment_customer",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Dropshipment Customer Name"),
			"fieldname": "custom_dropshipment_customer_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Box Qty"), "fieldname": "total_box_qty", "fieldtype": "Data", "width": 150},
		{"label": _("Checked Qty"), "fieldname": "total_checked_qty", "fieldtype": "Data", "width": 150},
		{"label": _("Delivered Qty"), "fieldname": "total_delivered_qty", "fieldtype": "Data", "width": 150},
		{"label": _("Return"), "fieldname": "total_return", "fieldtype": "Data", "width": 150},
		{"label": _("Weight"), "fieldname": "total_weight", "fieldtype": "Data", "width": 150},
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
	trip = DocType("Delivery Trip")
	stop = DocType("Delivery Stop")

	excluded_customers = ["CCLD", "CCLVD", "CCLVC", "CCLMASSD"]

	query = (
		frappe.qb.from_(stop)
		.left_join(trip)
		.on(stop.parent == trip.name)
		.where(
			(trip.custom_delivery_date.between(filters.delivery_from_date, filters.delivery_to_date))
			& (trip.docstatus != 2)
			& (Field("customer").isin(excluded_customers))
		)
		.select(
			stop.customer,
			stop.custom_customer_name,
			stop.custom_inv_no.as_("inv_num"),
			stop.custom_inv_qty.as_("total_box_qty"),
			stop.custom_dropshipment_customer,
			stop.custom_dropshipment_customer_name,
			stop.custom_checked_qty.as_("total_checked_qty"),
			stop.custom_delivered_qty.as_("total_delivered_qty"),
			stop.custom_return_.as_("total_return"),
			stop.custom_weight.as_("total_weight"),
			stop.custom_parent_territory,
			stop.custom_territory,
		)
	)

	if filters.get("customer"):
		query = query.where(stop.customer == filters.customer)

	return query.run(as_dict=True)


def get_total_customers(filters):
	data = frappe.db.sql(
		"""
			SELECT
				COUNT(ds.customer) AS total_customers
			FROM
				`tabDelivery Stop` ds
			LEFT JOIN
				`tabDelivery Trip` dt ON ds.parent = dt.name
			WHERE
				dt.docstatus != 2
				AND dt.custom_delivery_date BETWEEN %(delivery_from_date)s AND %(delivery_to_date)s
				AND ds.customer IN ('CCLD', 'CCLVD', 'CCLVC', 'CCLMASSD')
		""",
		{
			"delivery_from_date": filters.get("delivery_from_date"),
			"delivery_to_date": filters.get("delivery_to_date"),
		},
		as_dict=True,
	)

	return data
