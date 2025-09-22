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
			"label": _("Customer"),
			"fieldname": "customer",
			"fieldtype": "Link",
			"options": "Customer",
			"width": 150,
		},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{
			"label": _("Dealer"),
			"fieldname": "dealer",
			"fieldtype": "Link",
			"options": "Company",
			"width": 150,
		},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{
			"label": _("VIN/ Serial No"),
			"fieldname": "vin_serial_no",
			"fieldtype": "Link",
			"options": "Vehicle Stock",
			"width": 150,
		},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{"label": _("Colour"), "fieldname": "colour", "fieldtype": "Data", "width": 150},
		{
			"label": _("Customer Retail Amount"),
			"fieldname": "retail_amount",
			"fieldtype": "Currency",
			"width": 150,
		},
		{"label": _("Engine No"), "fieldname": "engine_no", "fieldtype": "Data", "width": 150},
		{"label": _("Microdot No"), "fieldname": "microdot_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Microdot Fitted By"),
			"fieldname": "microdot_fitted_by",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Sale Type"), "fieldname": "sale_type", "fieldtype": "Data", "width": 150},
		{"label": _("Finance Method"), "fieldname": "finance_method", "fieldtype": "Data", "width": 150},
		{"label": _("Financed By"), "fieldname": "financed_by", "fieldtype": "Data", "width": 150},
		{"label": _("Sales Person"), "fieldname": "sales_person", "fieldtype": "Data", "width": 150},
		{
			"label": _("Sales Person Full Names"),
			"fieldname": "sales_person_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Payment Date"), "fieldname": "payment_date", "fieldtype": "Date", "width": 150},
		{"label": _("Delivery Date"), "fieldname": "delivery_date", "fieldtype": "Date", "width": 150},
		{"label": _("Retail Date"), "fieldname": "retail_date", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Phone"), "fieldname": "customer_phone", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Email"), "fieldname": "customer_email", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Address"), "fieldname": "customer_address", "fieldtype": "Data", "width": 150},
		{
			"label": _("Customer Invoice No"),
			"fieldname": "customer_invoice_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Customer Invoice Date"),
			"fieldname": "customer_invoice_date",
			"fieldtype": "Date",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	sale = DocType("Vehicle Retail")
	items = DocType("Vehicles Sale Items")

	query = (
		frappe.qb.from_(sale)
		.join(items)
		.on(sale.name == items.parent)
		.select(
			sale.customer,
			sale.customer_name,
			sale.dealer,
			sale.status,
			items.vin_serial_no,
			items.model,
			items.colour,
			items.retail_amount,
			items.engine_no,
			items.microdot_no,
			items.microdot_fitted_by,
			sale.sale_type,
			sale.finance_method,
			sale.financed_by,
			sale.sales_person,
			sale.sales_person_full_names,
			sale.payment_date,
			sale.delivery_date,
			sale.retail_date,
			sale.customer_phone,
			sale.customer_email,
			sale.customer_address,
			items.customer_invoice_no,
			items.customer_invoice_date,
		)
		.where(
			(sale.creation.between(filters.from_date, filters.to_date))
			& (sale.dealer == filters.dealer)
			& (sale.docstatus != 2)
		)
	)

	if filters.get("customer"):
		query = query.where(sale.customer == filters.customer)

	return query.run(as_dict=True)
