// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Warranty Claims Report"] = {
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
			default: frappe.datetime.add_days(frappe.datetime.get_today(), 1),
			reqd: 1,
		},
		{
			fieldname: "vin_serial_no",
			label: __("VIN/ Serial No"),
			fieldtype: "Link",
			options: "Vehicle Stock",
		},
		{
			fieldname: "model",
			label: __("Model"),
			fieldtype: "Link",
			options: "Model Administration",
		},
		{
			fieldname: "brand",
			label: __("Brand"),
			fieldtype: "Link",
			options: "Brand",
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_default("company"),
			reqd: 1,
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: ["Pending", "Approved", "Declined"],
		},
		{
			fieldname: "failure_from_date",
			label: __("Failure From Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "failure_to_date",
			label: __("Failure To Date"),
			fieldtype: "Date",
		},
	],
};
