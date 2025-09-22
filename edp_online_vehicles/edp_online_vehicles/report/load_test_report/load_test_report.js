// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Load Test Report"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), 1),
			reqd: 1,
		},
		{
			fieldname: "vin_serial_no",
			label: __("Vin/Serial No"),
			fieldtype: "Link",
			options: "Vehicle Stock",
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "tested_by",
			label: __("Tested By"),
			fieldtype: "Link",
			options: "Supplier",
		},
		{
			fieldname: "model",
			label: __("Model"),
			fieldtype: "Link",
			options: "Model Administration",
		},
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_default("company"),
			reqd: 1,
		},
	],
};
