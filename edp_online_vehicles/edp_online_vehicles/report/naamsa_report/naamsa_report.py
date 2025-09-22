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
		{"label": _("MMYYYY"), "fieldname": "mmyyyy", "fieldtype": "Data", "width": 150},
		{"label": _("NaamSA Code"), "fieldname": "naamsa_code", "fieldtype": "Data", "width": 150},
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data", "width": 150},
		{
			"label": _("NaamSA Colour Code"),
			"fieldname": "naamsa_colour_code",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Model Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		{"label": _("Model Code"), "fieldname": "model_code", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Code Common"),
			"fieldname": "model_code_common",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	data = []

	model = DocType("Model Administration")
	stock = DocType("Vehicle Stock")
	colours = DocType("Model Colour")

	query = (
		frappe.qb.from_(model)
		.left_join(stock)
		.on(stock.model == model.model_code)
		.left_join(colours)
		.on(colours.name == stock.colour)
		.select(
			model.creation,
			model.naamsa_code,
			stock.dealer,
			colours.naamsa_colour_code,
			stock.colour,
			model.model_code,
			model.model_code_common,
			model.model_description,
		)
		.where(
			(model.creation.between(filters.from_date, filters.to_date)) & (stock.dealer == filters.dealer)
		)
	)

	result = query.run(as_dict=True)

	for row in result:
		creation_datetime = row["creation"]

		month = creation_datetime.strftime("%m")
		year = creation_datetime.strftime("%Y")

		code = f"{month}{year}"

		row["mmyyyy"] = code

		data.append(row)

	return data
