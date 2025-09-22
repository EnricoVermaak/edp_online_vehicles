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
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{"label": _("Stock No"), "fieldname": "stock_no", "fieldtype": "Data", "width": 150},
		{"label": _("Engine No"), "fieldname": "engine_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		{"label": _("Vehicles Type"), "fieldname": "vehicle_type", "fieldtype": "Data", "width": 150},
		{"label": _("Microdot"), "fieldname": "microdot", "fieldtype": "Data", "width": 150},
		{
			"label": _("Microdot Fitted By"),
			"fieldname": "microdot_fitted_by",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{"label": _("HQ Invoice Date"), "fieldname": "hq_invoice_date", "fieldtype": "Date", "width": 150},
		{"label": _("HQ Invoice No"), "fieldname": "hq_invoice_no", "fieldtype": "Data", "width": 150},
		{"label": _("HQ Invoice Amt"), "fieldname": "hq_invoice_amt", "fieldtype": "Currency", "width": 150},
		{
			"label": _("Dealer Invoice Date"),
			"fieldname": "dealer_invoice_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Dealer Invoice No"),
			"fieldname": "dealer_invoice_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Dealer Invoice Amt"),
			"fieldname": "dealer_invoice_amt",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Retail Amt (Excl)"),
			"fieldname": "retail_amt_excl",
			"fieldtype": "Currency",
			"width": 150,
		},
		{"label": _("Financed By"), "fieldname": "financed_by", "fieldtype": "Data", "width": 150},
		{"label": _("Payment Terms"), "fieldname": "payment_terms", "fieldtype": "Data", "width": 150},
		{"label": _("Sales Person"), "fieldname": "sales_person", "fieldtype": "Data", "width": 150},
		{"label": _("Sale Type"), "fieldname": "sale_type", "fieldtype": "Data", "width": 150},
		{"label": _("Payment Date"), "fieldname": "payment_date", "fieldtype": "Date", "width": 150},
		{"label": _("Delivery Date"), "fieldname": "delivery_date", "fieldtype": "Date", "width": 150},
		{"label": _("Retail Date"), "fieldname": "retail_date", "fieldtype": "Date", "width": 150},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Phone"), "fieldname": "customer_phone", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Email"), "fieldname": "customer_email", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Address"), "fieldname": "customer_address", "fieldtype": "Data", "width": 150},
	]

	return columns


def get_data(filters):
	sale = DocType("Vehicle Retail")

	query = (
		frappe.qb.from_(sale)
		.select(
			sale.vin_serial_no,
			sale.stock_no,
			sale.engine_no,
			sale.model,
			sale.colour,
			sale.vehicle_type,
			sale.microdot,
			sale.microdot_fitted_by,
			sale.status,
			sale.hq_invoice_date,
			sale.hq_invoice_no,
			sale.hq_invoice_amt,
			sale.dealer_invoice_date,
			sale.dealer_invoice_no,
			sale.dealer_invoice_amt,
			sale.retail_amt_excl,
			sale.financed_by,
			sale.payment_terms,
			sale.sales_person,
			sale.sale_type,
			sale.payment_date,
			sale.delivery_date,
			sale.retail_date,
			sale.customer,
			sale.customer_name,
			sale.customer_phone,
			sale.customer_email,
			sale.customer_address,
		)
		.where(sale.creation.between(filters.from_date, filters.to_date))
	)

	if filters.get("customer"):
		query = query.where(sale.customer == filters.customer)

	if filters.get("model"):
		query = query.where(sale.model == filters.model)

	return query.run(as_dict=True)
