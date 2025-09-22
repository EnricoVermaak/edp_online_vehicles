# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


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
		},
		{
			"label": _("Model"),
			"fieldname": "model",
			"fieldtype": "Data",
		},
		{
			"label": _("Description"),
			"fieldname": "description",
			"fieldtype": "Data",
		},
		{
			"label": _("Warehouse"),
			"fieldname": "warehouse",
			"fieldtype": "Data",
		},
		{
			"label": _("Dealer"),
			"fieldname": "dealer",
			"fieldtype": "Data",
		},
		{
			"label": _("Transit Start Date"),
			"fieldname": "transit_start_date",
			"fieldtype": "Date",
		},
	]

	return columns


def get_data(filters):
	user = frappe.session.user

	# Get the default company for the logged-in user
	default_company = frappe.defaults.get_user_default("company", user)

	if not default_company:
		frappe.throw("Default Company is not set for the user.")

	# Fetch the company document and set the transit warehouse
	com_doc = frappe.get_doc("Company", default_company)
	transit_warehouse = f"Goods In Transit - {com_doc.abbr}"

	# Base SQL query
	base_query = """
        SELECT
            vs.name AS vin_serial_no,
            vs.model,
            vs.description,
            sed.t_warehouse AS warehouse,
            se.posting_date AS transit_start_date,
            se.custom_dealer AS dealer
        FROM
            `tabVehicle Stock` vs
        LEFT JOIN
            `tabStock Entry Detail` sed ON sed.serial_no = vs.vin_serial_no
        LEFT JOIN
            `tabStock Entry` se ON se.name = sed.parent
        LEFT JOIN
            `tabSerial No` sn ON sn.name = vs.vin_serial_no
        WHERE
            sed.t_warehouse = %(transit_warehouse)s
            AND se.docstatus = 1
            AND se.stock_entry_type = 'Material Transfer'
            AND sn.warehouse = %(transit_warehouse)s
    """

	# Additional filter for model if provided
	conditions = []
	parameters = {"transit_warehouse": transit_warehouse}

	if filters.get("model"):
		conditions.append("vs.model = %(model)s")
		parameters["model"] = filters.get("model")

	# Append conditions to the query if any
	if conditions:
		base_query += " AND " + " AND ".join(conditions)

	# Execute the query with parameters
	query = frappe.db.sql(base_query, parameters, as_dict=True)

	return query
