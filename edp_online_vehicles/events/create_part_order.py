# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import getdate
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def create_part_order_from_booking(docname):
	doc = frappe.get_doc("Vehicle Service Booking", docname)

	if not doc.table_jwkk or len(doc.table_jwkk) == 0:
		frappe.throw("No parts added to the parts table, please add parts to perform this action")
	if not doc.part_schedule_date:
		frappe.throw("Please select a Scheduled Delivery Date under Parts Table")

	order_types = frappe.get_all("Part Order Type", pluck="name")
	if not order_types:
		frappe.throw("No Part Order Type found. Please create a Part Order Type first.")
	order_type = order_types[0]

	delivery_date = getdate(doc.part_schedule_date)

	newdoc = frappe.new_doc("Part Order")
	newdoc.dealer = doc.dealer
	newdoc.order_type = order_type
	newdoc.delivery_method = "Delivery"
	newdoc.delivery_date = delivery_date
	newdoc.dealer_order_no = docname
	newdoc.customer = doc.customer

	for part in doc.table_jwkk:
		newdoc.append(
			"table_avsu",
			{
				"part_no": part.item,
				"description": part.description,
				"qty": part.qty,
				"dealer_billing_excl": part.price_excl,
				"total_excl": part.total_excl,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Part Order", newdoc.name)
	frappe.msgprint(f"New Part Order is Created {newdoc_link}")