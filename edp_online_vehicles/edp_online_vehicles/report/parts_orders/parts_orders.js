// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Parts Orders"] = {
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
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Dealer Customer",
		},
		{
			fieldname: "fleet_customer",
			label: __("Fleet Customer"),
			fieldtype: "Link",
			options: "Fleet Customer",
		},
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
		},
	],
};
