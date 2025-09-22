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
			"label": _("Document ID"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Delivery Trip",
			"width": 150,
		},
		{"label": _("Series"), "fieldname": "naming_series", "fieldtype": "Data", "width": 150},
		{"label": _("Company"), "fieldname": "company", "fieldtype": "Data", "width": 150},
		{"label": _("Driver"), "fieldname": "driver", "fieldtype": "Data", "width": 150},
		{"label": _("Driver Name"), "fieldname": "driver_name", "fieldtype": "Data", "width": 150},
		{"label": _("Driver Email"), "fieldname": "driver_email", "fieldtype": "Data", "width": 150},
		{"label": _("Driver Address"), "fieldname": "driver_address", "fieldtype": "Data", "width": 150},
		{
			"label": _("Total Estimated Distance"),
			"fieldname": "total_distance",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Distance UOM"), "fieldname": "uom", "fieldtype": "Data", "width": 150},
		{"label": _("vehicles"), "fieldname": "Vehicles", "fieldtype": "Data", "width": 150},
		{"label": _("Delivery Date"), "fieldname": "custom_delivery_date", "fieldtype": "Date", "width": 150},
		{"label": _("Employee"), "fieldname": "employee", "fieldtype": "Data", "width": 150},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{
			"label": _("Invoice No"),
			"fieldname": "custom_inv_no",
			"fieldtype": "Link",
			"options": "Sales Invoice",
			"width": 150,
		},
		{"label": _("Invoice Qty"), "fieldname": "custom_inv_qty", "fieldtype": "Int", "width": 150},
		{"label": _("Weight"), "fieldname": "custom_weight", "fieldtype": "Float", "width": 150},
		{
			"label": _("Parent Territory"),
			"fieldname": "custom_parent_territory",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Territory"), "fieldname": "custom_territory", "fieldtype": "Data", "width": 150},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "custom_customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Address Name"), "fieldname": "address", "fieldtype": "Data", "width": 150},
		{"label": _("Locked"), "fieldname": "locked", "fieldtype": "Check", "width": 150},
		{
			"label": _("Customer Address"),
			"fieldname": "customer_address",
			"fieldtype": "Small Text",
			"width": 150,
		},
		{"label": _("Visited"), "fieldname": "visited", "fieldtype": "Check", "width": 150},
		{"label": _("Delivery Note"), "fieldname": "delivery_note", "fieldtype": "Data", "width": 150},
		{"label": _("Grand Total"), "fieldname": "grand_total", "fieldtype": "Currency", "width": 150},
		{"label": _("Contact Name"), "fieldname": "contact", "fieldtype": "Data", "width": 150},
		{"label": _("Email sent to"), "fieldname": "email_sent_to", "fieldtype": "Data", "width": 150},
		{
			"label": _("Customer Contact"),
			"fieldname": "customer_contact",
			"fieldtype": "Small Text",
			"width": 150,
		},
		{"label": _("Distance"), "fieldname": "distance", "fieldtype": "Float", "width": 150},
		{
			"label": _("Estimated Arrival"),
			"fieldname": "estimated_arrival",
			"fieldtype": "Datetime",
			"width": 150,
		},
		{"label": _("Latitude"), "fieldname": "lat", "fieldtype": "Float", "width": 150},
		{"label": _("Longitude"), "fieldname": "lng", "fieldtype": "Float", "width": 150},
		{"label": _("UOM"), "fieldname": "uom", "fieldtype": "Data", "width": 150},
		{"label": _("Details"), "fieldname": "details", "fieldtype": "Data", "width": 150},
	]

	return columns


def get_data(filters):
	deliver = frappe.qb.DocType("Delivery Trip")
	stops = frappe.qb.DocType("Delivery Stop")

	query = (
		frappe.qb.from_(stops)
		.left_join(deliver)
		.on(deliver.name == stops.parent)
		.where(
			(deliver.custom_delivery_date.between(filters.delivery_from_date, filters.delivery_to_date))
			& (deliver.docstatus != 2)
		)
		.select(
			deliver.name,
			deliver.naming_series,
			deliver.company,
			deliver.driver,
			deliver.driver_name,
			deliver.driver_email,
			deliver.driver_address,
			deliver.total_distance,
			deliver.uom,
			deliver.vehicles,
			deliver.custom_delivery_date,
			deliver.employee,
			deliver.status,
			stops.custom_inv_no,
			stops.custom_inv_qty,
			stops.custom_weight,
			stops.custom_parent_territory,
			stops.custom_territory,
			stops.customer,
			stops.custom_customer_name,
			stops.address,
			stops.locked,
			stops.customer_address,
			stops.visited,
			stops.delivery_note,
			stops.grand_total,
			stops.contact,
			stops.email_sent_to,
			stops.customer_contact,
			stops.distance,
			stops.estimated_arrival,
			stops.lat,
			stops.lng,
			stops.uom,
			stops.details,
		)
		.groupby(stops.custom_inv_no, deliver.name)
	)

	if filters.get("company"):
		query = query.where(stops.customer == filters.customer)

	if filters.get("driver"):
		query = query.where(deliver.driver == filters.driver)

	if filters.get("vehicles"):
		query = query.where(deliver.vehicles == filters.vehicles)

	if filters.get("customer"):
		query = query.where(stops.customer == filters.customer)

	return query.run(as_dict=True)
