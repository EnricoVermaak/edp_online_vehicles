# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Document ID"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Vehicle Order",
			"width": 150,
		},
		{
			"label": _("Dealer"),
			"fieldname": "dealer",
			"fieldtype": "Link",
			"options": "Company",
			"width": 150,
		},
		{"label": _("Dealer Order No"), "fieldname": "dealer_order_no", "fieldtype": "Data", "width": 150},
		{"label": _("Finance Option"), "fieldname": "finance_option", "fieldtype": "Data", "width": 150},
		{"label": _("Floorplan"), "fieldname": "floorplan", "fieldtype": "Data", "width": 150},
		{"label": _("Payment Terms"), "fieldname": "payment_terms", "fieldtype": "Data", "width": 150},
		{
			"label": _("Requested Delivery Date"),
			"fieldname": "requested_delivery_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{
			"label": _("Forecast Invoice Month"),
			"fieldname": "forecast_invoice_month",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Forecast Customer"),
			"fieldname": "forecast_customer",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Forecast Customer Email"),
			"fieldname": "forecast_customer_email",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Delivery Location"),
			"fieldname": "delivery_location",
			"fieldtype": "Small Text",
			"width": 150,
		},
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{"label": _("Description"), "fieldname": "description", "fieldtype": "Data", "width": 150},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 150},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		{"label": _("Purpose"), "fieldname": "purpose", "fieldtype": "Data", "width": 150},
		{"label": _("Price (Excl)"), "fieldname": "price_excl", "fieldtype": "Currency", "width": 150},
		{"label": _("Order From"), "fieldname": "order_from", "fieldtype": "Data", "width": 150},
		{"label": _("Item Status"), "fieldname": "item_status", "fieldtype": "Data", "width": 150},
		{"label": _("Order From Dealer"), "fieldname": "dealer_item", "fieldtype": "Data", "width": 150},
		{"label": _("ETA Warehouse"), "fieldname": "eta_warehouse", "fieldtype": "Data", "width": 150},
	]
	return columns


def get_data(filters):
	order = DocType("Vehicle Order")
	items = DocType("Vehicles Order Item")

	query = (
		frappe.qb.from_(items)
		.join(order)
		.on(items.parent == order.name)
		.where(order.creation.between(filters.from_date, filters.to_date))
		.select(
			order.name,
			order.dealer,
			order.dealer_order_no,
			order.finance_option,
			order.floorplan,
			order.payment_terms,
			order.requested_delivery_date,
			order.forecast_invoice_month,
			order.forecast_customer,
			order.forecast_customer_email,
			order.status,
			order.delivery_location,
			items.vin_serial_no,
			items.model,
			items.description,
			items.model_year,
			items.colour,
			items.purpose,
			items.price_excl,
			items.order_from,
			items.status.as_("item_status"),
			items.dealer.as_("dealer_item"),
			items.eta_warehouse,
		)
	)

	if filters.get("dealer"):
		query = query.where(order.dealer == filters.dealer)

	if filters.get("status"):
		if filters.get("status") != "All":
			query = query.where(items.status == filters.status)

	return query.run(as_dict=True)
