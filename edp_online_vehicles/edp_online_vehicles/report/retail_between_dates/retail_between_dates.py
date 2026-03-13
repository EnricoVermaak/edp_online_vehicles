# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import DocType


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def _has_aor_fields():
	try:
		return frappe.get_meta("Vehicle Retail").has_field("custom_aor")
	except Exception:
		return False


def is_hq():
	company = frappe.defaults.get_user_default("Company")
	if not company:
		return False
	try:
		return bool(frappe.db.get_value("Company", company, "custom_head_office"))
	except Exception:
		return False


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

	if _has_aor_fields():
		columns.extend([
			{"label": _("Regional Sales Manager"), "fieldname": "regional_sales_manager", "fieldtype": "Data", "width": 180},
			{"label": _("Region"), "fieldname": "aor_region", "fieldtype": "Data", "width": 120},
			{"label": _("AOR"), "fieldname": "aor", "fieldtype": "Data", "width": 120},
			{"label": _("AOR LD"), "fieldname": "aor_ld", "fieldtype": "Data", "width": 120},
		])

	return columns


def get_data(filters):
	sale = DocType("Vehicle Retail")
	items = DocType("Vehicles Sale Items")
	has_aor = _has_aor_fields()

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
		.where(sale.creation.between(filters.from_date, filters.to_date))
		.where(sale.docstatus != 2)
	)

	if not is_hq():
		dealer = filters.get("dealer") or frappe.defaults.get_user_default("Company")
		if dealer:
			query = query.where(sale.dealer == dealer)

	if has_aor:
		company = DocType("Company")
		query = (
			query
			.left_join(company).on(sale.dealer == company.name)
			.select(
				sale.custom_aor_region.as_("aor_region"),
				sale.custom_aor,
				sale.custom_aor_ld.as_("aor_ld"),
				company.custom_regional_sales_manager.as_("regional_sales_manager"),
			)
		)

	if filters.get("customer"):
		query = query.where(sale.customer == filters.customer)

	data = query.run(as_dict=True)

	if has_aor:
		aor_names = {row.get("custom_aor") for row in data if row.get("custom_aor")}
		aor_code_map = {}
		if aor_names:
			for aor_name in aor_names:
				aor_doc = frappe.db.get_value("AOR", aor_name, "aor_code", as_dict=True)
				if aor_doc:
					aor_code_map[aor_name] = aor_doc.get("aor_code") or ""
		for row in data:
			row["aor"] = aor_code_map.get(row.get("custom_aor"), "")

	return data
