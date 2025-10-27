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
			"fieldname": "shipment_id",
			"fieldtype": "Link",
			"options": "Vehicles Shipment",
			"width": 150,
		},
		{"label": _("Supplier"), "fieldname": "supplier", "fieldtype": "Data", "width": 150},
		{"label": _("Shipment File No"), "fieldname": "shipment_file_no", "fieldtype": "Data", "width": 150},
		{"label": _("Target Warehouse"), "fieldname": "target_warehouse", "fieldtype": "Data", "width": 150},
		{"label": _("Vessel Name"), "fieldname": "vessel_name", "fieldtype": "Data", "width": 150},
		{"label": _("Exchange Rate"), "fieldname": "exchange_rate", "fieldtype": "Data", "width": 150},
		{
			"label": _("Factory Order Date"),
			"fieldname": "factory_order_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{"label": _("Production Date"), "fieldname": "production_date", "fieldtype": "Date", "width": 150},
		{"label": _("Shipment Date"), "fieldname": "shipment_date", "fieldtype": "Date", "width": 150},
		{"label": _("ETA Harbour"), "fieldname": "eta_harbour", "fieldtype": "Date", "width": 150},
		{"label": _("ETA Warehouse"), "fieldname": "eta_warehouse", "fieldtype": "Date", "width": 150},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{
			"label": _("Hide on Stock Availability"),
			"fieldname": "hide_on_stock_availability",
			"fieldtype": "Check",
			"width": 150,
		},
		{"label": _("Satus"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{"label": _("Container No"), "fieldname": "container_no", "fieldtype": "Data", "width": 150},
		{"label": _("Seal No"), "fieldname": "seal_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model Code"), "fieldname": "model_code", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 150},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 150},
		{"label": _("Stock No"), "fieldname": "stock_no", "fieldtype": "Data", "width": 150},
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{"label": _("Engine No"), "fieldname": "engine_no", "fieldtype": "Data", "width": 150},
		{"label": _("Jet No"), "fieldname": "jet_no", "fieldtype": "Data", "width": 150},
		{"label": _("Frame No"), "fieldname": "frame_no", "fieldtype": "Data", "width": 150},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		#{"label": _("Colour Code"), "fieldname": "colour_code", "fieldtype": "Data", "width": 150},
		{
			"label": _("Cost Price (Excl)"),
			"fieldname": "cost_price_excl",
			"fieldtype": "Currency",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	shipment = DocType("Vehicles Shipment")
	items = DocType("Vehicles Shipment Items")

	query = (
		frappe.qb.from_(items)
		.join(shipment)
		.on(items.parent == shipment.name)
		.where(
			(shipment.creation.between(filters.from_date, filters.to_date))
			& (shipment.dealer == filters.dealer)
		)
		.select(
			shipment.name.as_("shipment_id"),
			shipment.supplier,
			shipment.shipment_file_no,
			shipment.vessel_name,
			shipment.exchange_rate,
			shipment.factory_order_date,
			shipment.production_date,
			shipment.shipment_date,
			shipment.eta_harbour,
			shipment.eta_warehouse,
			shipment.status,
			shipment.hide_on_stock_availability,
			items.target_warehouse,
			items.status,
			items.container_no,
			# items.seal_no,
			items.model_code,
			items.model_description,
			items.brand,
			items.model_year,
			items.stock_no,
			items.vin_serial_no,
			items.engine_no,
			items.jet_no,
			items.frame_no,
			items.colour,
			#items.colour_code,
			items.cost_price_excl,
		)
		.orderby(shipment.vessel_name)
	)

	if filters.get("supplier"):
		query = query.where(shipment.supplier == filters.supplier)

	if filters.get("status"):
		if filters.get("status") != "All":
			query = query.where(shipment.status == filters.status)
		else:
			pass

	return query.run(as_dict=True)
