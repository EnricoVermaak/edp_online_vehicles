# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	return [
		{"fieldname": "af_cf_invoice_no", "label": "AF/ CF Invoice No", "fieldtype": "Data", "width": 120},
		{"fieldname": "inspection_status", "label": "Inspection Status", "fieldtype": "Data", "width": 120},
		{"fieldname": "inspector", "label": "Assessor", "fieldtype": "Data", "width": 120},
		{"fieldname": "requested_by", "label": "Requested By", "fieldtype": "Data", "width": 120},
		{"fieldname": "requested_by_date", "label": "Requested By Date", "fieldtype": "Date", "width": 120},
		{"fieldname": "f_and_i", "label": "F&I", "fieldtype": "Data", "width": 120},
		{"fieldname": "client_name", "label": "Client Name", "fieldtype": "Data", "width": 120},
		{"fieldname": "bank", "label": "Bank", "fieldtype": "Data", "width": 120},
		{
			"fieldname": "inspection_contact_name",
			"label": "Inspection Contact Name",
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "seller_name", "label": "Seller Name", "fieldtype": "Data", "width": 120},
		{"fieldname": "client_number", "label": "Client Number", "fieldtype": "Phone", "width": 120},
		{
			"fieldname": "bank_reference_number",
			"label": "Bank Reference Number",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "inspection_contact_number",
			"label": "Inspection Contact Number",
			"fieldtype": "Phone",
			"width": 120,
		},
		{"fieldname": "seller_number", "label": "Seller Number", "fieldtype": "Phone", "width": 120},
		{
			"fieldname": "inspection_address",
			"label": "Inspection Address",
			"fieldtype": "Small Text",
			"width": 120,
		},
		{
			"fieldname": "inspection_at_seller_address",
			"label": "Is the inspection taking place at the seller premises?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "please_specify_reason_why_inspection_is_not_at_seller_premises",
			"label": "Please specify reason why inspection is not at seller premises",
			"fieldtype": "Small Text",
			"width": 120,
		},
		{"fieldname": "make", "label": "Make", "fieldtype": "Data", "width": 120},
		{"fieldname": "model", "label": "Model", "fieldtype": "Data", "width": 120},
		{"fieldname": "registration_no", "label": "Registration No", "fieldtype": "Data", "width": 120},
		{"fieldname": "mm_code", "label": "MM Code", "fieldtype": "Data", "width": 120},
		{"fieldname": "invoice_value", "label": "Invoice Value", "fieldtype": "Currency", "width": 120},
		{"fieldname": "engine_no", "label": "Engine No", "fieldtype": "Data", "width": 120},
		{"fieldname": "vin_no", "label": "VIN No", "fieldtype": "Data", "width": 120},
		{"fieldname": "colour", "label": "Colour", "fieldtype": "Data", "width": 120},
		{"fieldname": "mileage", "label": "Mileage", "fieldtype": "Data", "width": 120},
		{"fieldname": "retail_price", "label": "Retail Price", "fieldtype": "Currency", "width": 120},
		{
			"fieldname": "natis_attached",
			"label": "Is the NATIS document attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "why_is_the_natis_document_not_attached",
			"label": "Why is the NATIS document not attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "af_cf_invoice_attached",
			"label": "Is the AF/ CF invoice attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "why_is_the_af_cf_invoice_not_attachhed",
			"label": "Why is the AF/ CF invoice not attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "seller_invoice_attached",
			"label": "Is the seller invoice attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "why_is_the_seller_invoice_not_attached",
			"label": "Why is the seller invoice not attached?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "inspection_notes",
			"label": "Inspection Notes",
			"fieldtype": "Small Text",
			"width": 120,
		},
		{"fieldname": "assessor_notes", "label": "Assessor Notes", "fieldtype": "Small Text", "width": 120},
		{
			"fieldname": "seller_present",
			"label": " Is the seller present at the inspection?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "asset_detail_confirmation",
			"label": "Confirm if the asset details above for the inspection is accurate",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "asset_detail_not_accurate",
			"label": "Please specify why asset details is not accurate",
			"fieldtype": "Small Text",
			"width": 120,
		},
		{
			"fieldname": "market_related",
			"label": " Value of asset at the time of transaction: Is the selling price market related?",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "not_market_related",
			"label": "Please specify why selling price is not market related",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "inspection_confirmation",
			"label": "The asset was inspected, and I confirm that the asset is fit for resale and finance facilitation. I am not aware of any defects.",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "finance_agreement_cannot_proceed",
			"label": "Please specify reason why finance agreement cannot proceed",
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "date_of_inspection", "label": "Date of Inspection", "fieldtype": "Date", "width": 120},
		{
			"fieldname": "assessor_full_names",
			"label": "Assessor Full Names",
			"fieldtype": "Data",
			"width": 120,
		},
		{"fieldname": "inspector_signed_date", "label": "Signed Date", "fieldtype": "Data", "width": 120},
		{"fieldname": "fandi_fullnames", "label": "F&I Full Names", "fieldtype": "Data", "width": 120},
		{
			"fieldname": "seller_representative_name",
			"label": "Seller/ Representative Name",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "designation_of_representative",
			"label": "Designation of Representative",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "seller_representative_signature_date",
			"label": "Seller/ Representative Signature Date",
			"fieldtype": "Date",
			"width": 120,
		},
		{
			"fieldname": "seller_unable_sign_reason",
			"label": "Please provide a reason if seller/representative unable or unwilling to sign.",
			"fieldtype": "Small Text",
			"width": 120,
		},
	]


def get_data(filters):
	inspection = frappe.qb.DocType("Inspection FSP")

	query = (
		frappe.qb.from_(inspection)
		.select(
			inspection.af_cf_invoice_no,
			inspection.inspection_status,
			inspection.inspector,
			inspection.requested_by,
			inspection.f_and_i,
			inspection.client_name,
			inspection.bank,
			inspection.inspection_contact_name,
			inspection.seller_name,
			inspection.client_number,
			inspection.bank_reference_number,
			inspection.inspection_contact_number,
			inspection.seller_number,
			inspection.inspection_address,
			inspection.inspection_at_seller_address,
			inspection.please_specify_reason_why_inspection_is_not_at_seller_premises,
			inspection.make,
			inspection.model,
			inspection.registration_no,
			inspection.mm_code,
			inspection.invoice_value,
			inspection.engine_no,
			inspection.vin_no,
			inspection.colour,
			inspection.mileage,
			inspection.retail_price,
			inspection.natis_attached,
			inspection.why_is_the_natis_document_not_attached,
			inspection.af_cf_invoice_attached,
			inspection.why_is_the_af_cf_invoice_not_attachhed,
			inspection.seller_invoice_attached,
			inspection.why_is_the_seller_invoice_not_attached,
			inspection.inspection_notes,
			inspection.assessor_notes,
			inspection.seller_present,
			inspection.asset_detail_confirmation,
			inspection.asset_detail_not_accurate,
			inspection.market_related,
			inspection.not_market_related,
			inspection.inspection_confirmation,
			inspection.finance_agreement_cannot_proceed,
			inspection.date_of_inspection,
			inspection.assessor_full_names,
			inspection.inspector_signed_date,
			inspection.fandi_fullnames,
			inspection.seller_representative_name,
			inspection.designation_of_representative,
			inspection.seller_representative_signature_date,
			inspection.seller_unable_sign_reason,
		)
		.where(inspection.creation.between(filters.from_date, filters.to_date))
	)

	if filters.get("af_cf_invoice_no"):
		query = query.where(inspection.af_cf_invoice_no == filters.get("af_cf_invoice_no"))

	if filters.get("inspection_status"):
		query = query.where(inspection.inspection_status == filters.get("inspection_status"))

	if filters.get("inspector"):
		query = query.where(inspection.inspector == filters.get("inspector"))

	if filters.get("f_and_i"):
		query = query.where(inspection.f_and_i == filters.get("f_and_i"))

	return query.run(as_dict=True)
