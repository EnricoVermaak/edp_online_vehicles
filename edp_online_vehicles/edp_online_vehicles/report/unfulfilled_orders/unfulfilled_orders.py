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
			"fieldname": "customer",
			"label": _("Customer No"),
			"fieldtype": "Link",
			"options": "Sales Order",
			"width": 120,
		},
		{"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "sales_order_no",
			"label": _("Sales Order No"),
			"fieldtype": "Link",
			"options": "Sales Order",
			"width": 120,
		},
		{"fieldname": "date_ordered", "label": _("Date Ordered"), "fieldtype": "Date", "width": 120},
		{"fieldname": "part_no", "label": _("Part No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "part_desc", "label": _("Part Description"), "fieldtype": "Data", "width": 120},
		{"fieldname": "qty", "label": _("Ordered Qty"), "fieldtype": "Int", "width": 120},
		{"fieldname": "delivered_qty", "label": _("Delivered Qty"), "fieldtype": "Int", "width": 120},
		{"fieldname": "qty_to_deliver", "label": _("Qty to be Delivered"), "fieldtype": "Int", "width": 120},
		{"fieldname": "order_placed_by", "label": _("Order Placed By"), "fieldtype": "Data", "width": 120},
		{"fieldname": "job_reference", "label": _("Job Reference"), "fieldtype": "Data", "width": 120},
	]

	return columns


def get_data(filters):
	sales_order = DocType("Sales Order")
	item = DocType("Sales Order Item")
	user = DocType("User")

	query = (
		frappe.qb.from_(item)
		.left_join(sales_order)
		.on(sales_order.name == item.parent)
		.left_join(user)
		.on(user.name == sales_order.owner)
		.select(
			sales_order.customer,
			sales_order.customer_name,
			(sales_order.name).as_("sales_order_no"),
			(sales_order.transaction_date).as_("date_ordered"),
			(item.item_code).as_("part_no"),
			(item.item_name).as_("part_desc"),
			item.qty,
			item.delivered_qty,
			(user.full_name).as_("order_placed_by"),
			(sales_order.custom_job_reference).as_("job_reference"),
		)
		.where(item.qty > item.delivered_qty)
	)

	if filters.get("customer"):
		query = query.where(sales_order.customer == filters.customer)

	sales = query.run(as_dict=True)

	for sale in sales:
		qty_to_deliver = sale["qty"] - sale["delivered_qty"]

		sale["qty_to_deliver"] = qty_to_deliver

	return sales
