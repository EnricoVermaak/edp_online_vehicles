// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["FSP Inspections Report"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), -1),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "af_cf_invoice_no",
			label: __("AF/ CF Invoice No"),
			fieldtype: "Link",
			options: "Vehicles Deals",
		},
		{
			fieldname: "inspection_status",
			label: __("Inspection Status:"),
			fieldtype: "Select",
			options: [
				{ value: "Draft", label: __("Draft") },
				{ value: "Inspected", label: __("Inspected") },
				{
					value: "Completed and Approved",
					label: __("Completed and Approved"),
				},
				{
					value: "Completed and Declined",
					label: __("Completed and Declined"),
				},
			],
		},
		{
			fieldname: "inspector",
			label: __("Assessor"),
			fieldtype: "Link",
			options: "User",
		},
		{
			fieldname: "f_and_i",
			label: __("F&I"),
			fieldtype: "Link",
			options: "User",
		},
	],
};
