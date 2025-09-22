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
			"label": _("VIN/ Serial No"),
			"fieldname": "vin_serial_no",
			"fieldtype": "Link",
			"options": "Vehicle Stock",
			"width": 150,
		},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model"),
			"fieldname": "model",
			"fieldtype": "Link",
			"options": "Model Administration",
			"width": 150,
		},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		{"label": _("Fuel Type"), "fieldname": "fuel_type", "fieldtype": "Data", "width": 150},
		{"label": _("Transmission"), "fieldname": "transmission", "fieldtype": "Data", "width": 150},
		{
			"label": _("Warranty Start Date"),
			"fieldname": "warranty_start_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Warranty End Date"),
			"fieldname": "warranty_end_date",
			"fieldtype": "Date",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	stock = frappe.qb.DocType("Vehicle Stock")
	model = frappe.qb.DocType("Model Administration")

	query = (
		frappe.qb.from_(stock)
		.left_join(model)
		.on(model.model_code == stock.model)
		.select(
			stock.vin_serial_no,
			stock.brand,
			stock.model,
			stock.colour,
			model.fuel_type,
			model.transmission,
			stock.warranty_start_date,
			stock.warranty_end_date,
		)
		.where(model.creation.between(filters.from_date, filters.to_date) & (stock.dealer == filters.dealer))
	)

	return query.run(as_dict=True)
