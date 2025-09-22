# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType
from frappe.query_builder.functions import Count, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	message = "This report excludes cancelled services."

	return columns, data, message


def get_columns():
	columns = [
		{"fieldname": "item", "label": _("Item Code"), "fieldtype": "Data", "width": 150},
		{"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 150},
		{"fieldname": "total_parts_ordered", "label": _("Total Parts"), "fieldtype": "Int", "width": 150},
		{"fieldname": "service_count", "label": _("Amount of Services"), "fieldtype": "Int", "width": 150},
	]
	return columns


def get_data(filters):
	service = DocType("Vehicles Service")
	parts = DocType("Service Parts Items")
	item = DocType("Item")

	hq_company = frappe.get_all("Company", filters={"custom_head_office": 1}, pluck="name")

	user_company = frappe.defaults.get_user_default("Company")

	query = (
		frappe.qb.from_(parts)
		.join(service)
		.on(service.name == parts.parent)
		.join(item)
		.on(item.name == parts.item)
		.where((service.creation.between(filters.from_date, filters.to_date)) & (service.docstatus != 2))
		.groupby(parts.item)
		.select(
			parts.item,
			item.item_name,
			Sum(parts.qty).as_("total_parts_ordered"),
			Count(service.name).distinct().as_("service_count"),
		)
	)

	if filters.get("customer"):
		query = query.where(service.customer == filters.customer)

	if user_company not in hq_company:
		query = query.where(service.dealer == user_company)

	return query.run(as_dict=True)
