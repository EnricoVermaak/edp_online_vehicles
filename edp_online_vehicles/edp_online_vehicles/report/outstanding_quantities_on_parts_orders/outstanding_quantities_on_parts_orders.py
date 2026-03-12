# Copyright (c) 2026, NexTash and contributors
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
			"options": "HQ Part Order",
			"width": 120,
		},
		{
			"label": _("Order Date/ Time"),
			"fieldname": "order_date_time",
			"fieldtype": "Datetime",
			"width": 120,
		},
		{"label": _("DMS Warehouse"), "fieldname": "custom_dms_warehouse", "fieldtype": "Data", "width": 120},
		{"label": _("Order Type"), "fieldname": "order_type", "fieldtype": "Data", "width": 120},
		{"label": _("Delivery Method"), "fieldname": "delivery_method", "fieldtype": "Data", "width": 120},
		{"label": _("Dealer"), "fieldname": "order_dealer", "fieldtype": "Data", "width": 120},
		{"label": _("Part No"), "fieldname": "part_no", "fieldtype": "Data", "width": 120},
		{"label": _("Description"), "fieldname": "description", "fieldtype": "Data", "width": 120},
		{"label": _("Qty"), "fieldname": "qty", "fieldtype": "Int", "width": 120},
		{"label": _("SOH"), "fieldname": "soh", "fieldtype": "Int", "width": 120},
		{"label": _("Qty Delivered"), "fieldname": "qty_delivered", "fieldtype": "Int", "width": 120},
		{
			"label": _("Dealer Billing (Excl) per Item"),
			"fieldname": "dealer_billing_excl",
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
	]

	return columns

def get_data(filters):
	order = DocType("HQ Part Order")
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
			(order.dealer).as_("order_dealer"),
			order_item.part_no,
			order_item.description,
			order_item.eta,
			order_item.qty,
			order_item.soh,
			order_item.qty_delivered,
			order_item.dealer_billing_excl,
			order_item.dealer_billing_incl,
			order_item.total_excl,
			order_item.total_incl,
			order_item.order_from,
			(order_item.dealer).as_("order_from_dealer"),
			(order.total_excl).as_("grand_total_excl"),
			order.vat,
			(order.name).as_("grand_total_incl"),
		)
		.where(
      		(order.creation.between(filters.from_date, filters.to_date)) &
			(order.total_qty_parts_ordered > order.total_qty_parts_delivered)
        )
	)

	if filters.get("dealer"):
		query = query.where(order.dealer == filters.dealer)

	if filters.get("custom_dms_warehouse"):
		query = query.where(order_item.custom_dms_warehouse == filters.custom_dms_warehouse)

	return query.run(as_dict=True)
