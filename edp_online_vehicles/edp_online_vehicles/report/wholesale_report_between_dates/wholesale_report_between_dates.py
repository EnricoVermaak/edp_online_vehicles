# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"label": _("Order Date"), "fieldname": "order_datetime", "fieldtype": "Datetime"},
		{"label": _("Order No"), "fieldname": "order_no", "fieldtype": "Link", "options": "Vehicle Order"},
		{"label": _("VIN/Serial No"), "fieldname": "vinserial_no", "fieldtype": "Data"},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data"},
		{"label": _("Model Description"), "fieldname": "description", "fieldtype": "Data"},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data"},
		{"label": _("Order Type"), "fieldname": "order_type", "fieldtype": "Data"},
		{"label": _("Purpose"), "fieldname": "purpose", "fieldtype": "Data"},
		{"label": _("Dealer Order No"), "fieldname": "dealer_order_no", "fieldtype": "Data"},
		{"label": _("Finance Option"), "fieldname": "finance_option", "fieldtype": "Data"},
		{"label": _("Price (Excl)"), "fieldname": "price_excl", "fieldtype": "Currency"},
		{"label": _("Order Placed By (Dealer)"), "fieldname": "order_placed_by", "fieldtype": "Data"},
		{"label": _("Order Placed By (User)"), "fieldname": "name_of_ordering_user", "fieldtype": "Data"},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data"},
	]

	return columns


def get_data(filters):
	from_date = filters.get("from_date")
	to_date = filters.get("to_date")

	# Ensure datetime format to filter the whole days
	from_datetime = f"{from_date} 00:00:00"
	to_datetime = f"{to_date} 23:59:59"

	base_query = """
        SELECT
            ho.order_no,
            ho.vinserial_no,
            ho.model,
            ho.description,
            ho.order_type,
            ho.order_datetime,
            ho.order_placed_by,
            ho.name_of_ordering_user,
			ho.colour,
			ho.purpose,
			ho.dealer_order_no,
			ho.finance_option,
			ho.price_excl,
			ho.status
        FROM
            `tabHead Office Vehicle Orders` ho
        WHERE
            ho.order_datetime BETWEEN %(from_datetime)s AND %(to_datetime)s
    	"""

	conditions = []
	parameters = {"from_datetime": from_datetime, "to_datetime": to_datetime}

	if filters.get("status"):
		conditions.append("ho.status = %(status)s")
		parameters["status"] = filters.get("status")

	# Append conditions to the query if any
	if conditions:
		base_query += " AND " + " AND ".join(conditions)

	query = frappe.db.sql(base_query, parameters, as_dict=True)

	return query
