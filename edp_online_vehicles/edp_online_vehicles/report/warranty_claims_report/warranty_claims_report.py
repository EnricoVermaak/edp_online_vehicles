# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Document ID"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Vehicles Warranty Claims",
			"width": 150,
		},
		{"label": _("VIN/ Serial No"), "fieldname": "vin_serial_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 150},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Brand"), "fieldname": "brand", "fieldtype": "Data", "width": 150},
		{"label": _("Engine No"), "fieldname": "engine_no", "fieldtype": "Data", "width": 150},
		{"label": _("Model Year"), "fieldname": "model_year", "fieldtype": "Data", "width": 150},
		{"label": _("OEM Approval No"), "fieldname": "oem_approval_no", "fieldtype": "Data", "width": 150},
		{"label": _("HO Approval No"), "fieldname": "ho_approval_no", "fieldtype": "Data", "width": 150},
		{
			"label": _("Dealer Jobcard No"),
			"fieldname": "dealer_jobcard_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data", "width": 150},
		{"label": _("Date of Failure"), "fieldname": "date_of_failure", "fieldtype": "Date", "width": 150},
		{"label": _("Odo Reading"), "fieldname": "odo_reading", "fieldtype": "Data", "width": 150},
		{"label": _("Reported By"), "fieldname": "reported_by", "fieldtype": "Data", "width": 150},
		{"label": _("Technician"), "fieldname": "technician", "fieldtype": "Data", "width": 150},
		{"label": _("Authorised By"), "fieldname": "approved_by", "fieldtype": "Data", "width": 150},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
		{"label": _("Summary"), "fieldname": "summary", "fieldtype": "Small Text", "width": 150},
		{"label": _("Return Reason"), "fieldname": "return_reason", "fieldtype": "Small Text", "width": 150},
		{"label": _("Customer"), "fieldname": "customer", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Phone"), "fieldname": "phone", "fieldtype": "Phone", "width": 150},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 150},
		{"label": _("Adress"), "fieldname": "adress", "fieldtype": "Small Text", "width": 150},
		{
			"label": _("Warranty Start Date"),
			"fieldname": "warranty_start_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Warranty End Date"),
			"fieldname": "warranty_end_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Warranty Period (Years)"),
			"fieldname": "warranty_period_years",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Extended Warranty Start Date"),
			"fieldname": "extended_warranty_start_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Extended Warranty End Date"),
			"fieldname": "extended_warranty_end_date",
			"fieldtype": "Date",
			"width": 150,
		},
		{
			"label": _("Extended Warranty Period (Years)"),
			"fieldname": "extended_warranty_period",
			"fieldtype": "Int",
			"width": 150,
		},
		{"label": _("Fault"), "fieldname": "fault", "fieldtype": "Small Text", "width": 150},
		{"label": _("Cause"), "fieldname": "cause", "fieldtype": "Small Text", "width": 150},
		{"label": _("Remedy"), "fieldname": "remedy", "fieldtype": "Small Text", "width": 150},
		{
			"label": _("Extra Cost Total (Excl)"),
			"fieldname": "extra_cost_total_excl",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Technician Full Names"),
			"fieldname": "technician_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Authorised By Full Names"),
			"fieldname": "authorised_by_full_names",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	warranty = frappe.qb.DocType("Vehicles Warranty Claims")

	query = (
		frappe.qb.from_(warranty)
		.select(
			warranty.name,
			warranty.vin_serial_no,
			warranty.model,
			warranty.model_description,
			warranty.brand,
			warranty.engine_no,
			warranty.model_year,
			warranty.oem_approval_no,
			warranty.ho_approval_no,
			warranty.dealer_jobcard_no,
			warranty.dealer,
			warranty.date_of_failure,
			warranty.odo_reading,
			warranty.reported_by,
			warranty.technician,
			warranty.approved_by,
			warranty.status,
			warranty.summary,
			warranty.return_reason,
			warranty.customer,
			warranty.customer_name,
			warranty.phone,
			warranty.email,
			warranty.adress,
			warranty.warranty_start_date,
			warranty.warranty_end_date,
			warranty.warranty_period_years,
			warranty.extended_warranty_start_date,
			warranty.extended_warranty_end_date,
			warranty.extended_warranty_period,
			warranty.fault,
			warranty.cause,
			warranty.remedy,
			warranty.extra_cost_total_excl,
			warranty.technician_full_names,
			warranty.authorised_by_full_names,
		)
		.where(
			(warranty.creation.between(filters.from_date, filters.to_date))
			& (warranty.dealer == filters.dealer)
		)
	)

	if filters.get("vin_serial_no"):
		query = query.where(warranty.vin_serial_no == filters.vin_serial_no)

	if filters.get("model"):
		query = query.where(warranty.model == filters.model)

	if filters.get("brand"):
		query = query.where(warranty.brand == filters.brand)

	if filters.get("customer"):
		query = query.where(warranty.customer == filters.customer)

	if filters.get("status"):
		query = query.where(warranty.status == filters.status)

	if filters.get("failure_from_date") and filters.get("failure_to_date"):
		query = query.where(
			warranty.date_of_failure.between(filters.failure_from_date, filters.failure_to_date)
		)

	return query.run(as_dict=True)
