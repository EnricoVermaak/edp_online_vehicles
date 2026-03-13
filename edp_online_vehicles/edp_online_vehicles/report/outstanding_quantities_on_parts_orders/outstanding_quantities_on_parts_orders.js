// Copyright (c) 2026, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Outstanding Quantities on Parts Orders"] = {
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
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
		},
		{
			fieldname: "custom_dms_warehouse",
			label: __("DMS Warehouse"),
			fieldtype: "Select",
			options: [
				"",
				"3PL",
				"DP WORLD",
				"FUCHS"
			],
		},
	]
};
