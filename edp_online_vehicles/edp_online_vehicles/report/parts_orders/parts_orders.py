# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from pypika import Case


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Part Order No"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Part Order",
			"width": 120,
		},
		{
			"label": _("Order Date/ Time"),
			"fieldname": "order_date_time",
			"fieldtype": "Datetime",
			"width": 120,
		},
		{"label": _("Order Type"), "fieldname": "order_type", "fieldtype": "Data", "width": 120},
		{"label": _("Delivery Method"), "fieldname": "delivery_method", "fieldtype": "Data", "width": 120},
		{"label": _("Sales Person"), "fieldname": "sales_person", "fieldtype": "Data", "width": 120},
		{"label": _("Dealer"), "fieldname": "order_dealer", "fieldtype": "Data", "width": 120},
		{"label": _("Dealer Order No"), "fieldname": "dealer_order_no", "fieldtype": "Data", "width": 120},
		{"label": _("Part No"), "fieldname": "part_no", "fieldtype": "Data", "width": 120},
		{"label": _("Description"), "fieldname": "description", "fieldtype": "Data", "width": 120},
		{"label": _("ETA"), "fieldname": "eta", "fieldtype": "Date", "width": 120},
		{"label": _("Qty"), "fieldname": "qty", "fieldtype": "Int", "width": 120},
		{"label": _("SOH"), "fieldname": "soh", "fieldtype": "Int", "width": 120},
		{"label": _("Qty Delivered"), "fieldname": "qty_delivered", "fieldtype": "Int", "width": 120},
		{"label": _("Open Orders"), "fieldname": "open_orders", "fieldtype": "Data", "width": 120},
		{
			"label": _("Dealer Billing (Excl) per Item"),
			"fieldname": "dealer_billing_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Disc Amount (Excl) per Item"),
			"fieldname": "disc_amount",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Air Freight Cost (Excl) per Item"),
			"fieldname": "air_freight_cost_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Dealer Billing (Incl) per Item"),
			"fieldname": "dealer_billing_incl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Total (Excl) per Item"),
			"fieldname": "total_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Total (Incl) per Item"),
			"fieldname": "total_incl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{"label": _("Order From"), "fieldname": "order_from", "fieldtype": "Data", "width": 120},
		{
			"label": _("Order From Dealer"),
			"fieldname": "order_from_dealer",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("Grand Total (Excl)"),
			"fieldname": "grand_total_excl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{"label": _("VAT"), "fieldname": "vat", "fieldtype": "Currency", "width": 120},
		{
			"label": _("Grand Total (Incl)"),
			"fieldname": "grand_total_incl",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Company Registration No"),
			"fieldname": "company_reg_no",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("Fleet Customer/Customer"),
			"fieldname": "customer_no",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Full Name"), "fieldname": "cust_full_name", "fieldtype": "Data", "width": 120},
		{"label": _("Phone"), "fieldname": "cust_phone", "fieldtype": "Data", "width": 120},
		{"label": _("Mobile"), "fieldname": "cust_mobile", "fieldtype": "Data", "width": 120},
		{"label": _("Email"), "fieldname": "cust_email", "fieldtype": "Data", "width": 120},
	]

	return columns


def get_data(filters):
	order = DocType("Part Order")
	order_item = DocType("Part Order Item")

	query = (
		frappe.qb.from_(order_item)
		.left_join(order)
		.on(order.name == order_item.parent)
		.select(
			order.name,
			order.order_date_time,
			order.order_type,
			order.delivery_method,
			order.sales_person,
			(order.dealer).as_("order_dealer"),
			order.dealer_order_no,
			order_item.part_no,
			order_item.description,
			order_item.eta,
			order_item.qty,
			order_item.soh,
			order_item.qty_delivered,
			order_item.open_orders,
			order_item.dealer_billing_excl,
			order_item.disc_amount,
			order_item.air_freight_cost_excl,
			order_item.dealer_billing_incl,
			order_item.total_excl,
			order_item.total_incl,
			order_item.order_from,
			(order_item.dealer).as_("order_from_dealer"),
			Case()
			.when(order.order_type == "Fleet", order.fleet_customer)
			.else_(order.customer)
			.as_("customer_no"),
			Case()
			.when(order.order_type == "Fleet", order.fleet_customer_name)
			.else_(order.full_name)
			.as_("cust_full_name"),
			Case()
			.when(order.order_type == "Fleet", order.fleet_customer_phone)
			.else_(order.phone)
			.as_("cust_phone"),
			Case()
			.when(order.order_type == "Fleet", order.fleet_customer_mobile)
			.else_(order.mobile)
			.as_("cust_mobile"),
			Case()
			.when(order.order_type == "Fleet", order.fleet_customer_email)
			.else_(order.email)
			.as_("cust_email"),
			order.company_reg_no,
			(order.total_excl).as_("grand_total_excl"),
			order.vat,
			(order.name).as_("grand_total_incl"),
		)
		.where(order.creation.between(filters.from_date, filters.to_date))
	)

	if filters.get("customer"):
		query = query.where(order.customer == filters.customer)

	if filters.get("fleet_customer"):
		query = query.where(order.fleet_customer == filters.fleet_customer)

	if filters.get("dealer"):
		query = query.where(order.dealer == filters.dealer)

	return query.run(as_dict=True)
