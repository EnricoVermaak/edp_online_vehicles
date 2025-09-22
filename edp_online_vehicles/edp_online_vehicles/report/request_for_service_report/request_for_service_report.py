# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Date


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{"fieldname": "vin_serial_no", "label": _("VIN/ Serial No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "model_no", "label": _("Model No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "mhe_fleet_no", "label": _("MHE Fleet No"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "request_for_service_date",
			"label": _("Request for Service Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{"fieldname": "odo_reading", "label": _("Odo Reading"), "fieldtype": "Int", "width": 120},
		{"fieldname": "customer", "label": _("Customer"), "fieldtype": "Data", "width": 120},
		{"fieldname": "customer_name", "label": _("Customer Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "current_location", "label": _("Current Location"), "fieldtype": "Data", "width": 120},
		{"fieldname": "price_list", "label": _("Price List"), "fieldtype": "Data", "width": 120},
		{"fieldname": "job_card_no", "label": _("Job Card No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "rfs_status", "label": _("RFS Status"), "fieldtype": "Data", "width": 120},
		{"fieldname": "service_no", "label": _("Service No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "service_date", "label": _("Service Date"), "fieldtype": "Data", "width": 120},
		{"fieldname": "technician", "label": _("Technician"), "fieldtype": "Data", "width": 120},
		{"fieldname": "centre", "label": _("Centre"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "total_vat_excl",
			"label": _("Total (VAT Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"fieldname": "parts_total_excl",
			"label": _("Parts Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"fieldname": "labours_total_excl",
			"label": _("Labours Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"fieldname": "extra_cost_total_excl",
			"label": _("Extra Cost Total (Excl)"),
			"fieldtype": "Currency",
			"width": 120,
		},
		{"fieldname": "quote_date", "label": _("Quote Date"), "fieldtype": "Date", "width": 120},
		{"fieldname": "quote_no", "label": _("Quote No"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "quote_preapproval_date",
			"label": _("Quote Pre- Approval Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "quote_preapproval_user",
			"label": _("Quote Pre- Approval User"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "fianl_approval_signature_date",
			"label": _("Quote Final Approval Signature Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "final_approval_user",
			"label": _("Quote Final Approval User"),
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "sr_date", "label": _("Order Date"), "fieldtype": "Date", "width": 120},
		{"fieldname": "client_order_no", "label": _("Client Order No"), "fieldtype": "Data", "width": 120},
		{"fieldname": "po_julian_month", "label": _("PO Julian Month"), "fieldtype": "Data", "width": 120},
		{"fieldname": "invoice_date", "label": _("Invoice Date"), "fieldtype": "Date", "width": 120},
		{"fieldname": "invoice_no", "label": _("Invoice No"), "fieldtype": "Data", "width": 120},
		{
			"fieldname": "invoice_approval_date",
			"label": _("Invoice Approval Date"),
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "invoice_approval_user",
			"label": _("Invoice Approval User"),
			"fieldtype": "Data",
			"width": 120,
		},
	]
	return columns


def get_data(filters):
	service = frappe.qb.DocType("Request for Service")

	status = filters.get("rfs_status", "All")

	query = (
		frappe.qb.from_(service)
		.select(
			service.vin_serial_no,
			service.model_no,
			service.mhe_fleet_no,
			service.request_for_service_date,
			service.odo_reading,
			service.customer,
			service.customer_name,
			service.current_location,
			service.price_list,
			service.job_card_no,
			service.rfs_status,
			service.service_no,
			service.service_date,
			service.technician,
			service.centre,
			service.total_vat_excl,
			service.parts_total_excl,
			service.labours_total_excl,
			service.extra_cost_total_excl,
			service.quote_date,
			service.quote_no,
			service.quote_preapproval_date,
			service.quote_preapproval_user,
			service.fianl_approval_signature_date,
			service.final_approval_user,
			service.sr_date,
			service.client_order_no,
			service.po_julian_month,
			service.invoice_date,
			service.invoice_no,
			service.invoice_approval_date,
			service.invoice_approval_user,
		)
		.where(Date(service.creation).between(filters.from_date, filters.to_date))
	)

	if filters.get("vin_serial_no"):
		query = query.where(service.vin_serial_no == filters.get("vin_serial_no"))

	if filters.get("customer"):
		query = query.where(service.customer == filters.get("customer"))

	if filters.get("rfs_status"):
		if status != "All":
			query = query.where(service.rfs_status == filters.get("rfs_status"))
		else:
			pass

	return query.run(as_dict=1)
