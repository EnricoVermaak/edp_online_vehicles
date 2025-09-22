// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Delivery Trip"] = {
	filters: [
		{
			fieldname: "delivery_from_date",
			label: __("Delivery From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "delivery_to_date",
			label: __("Delivery To Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), 1),
			reqd: 1,
		},
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
		},
		{
			fieldname: "driver",
			label: __("Driver"),
			fieldtype: "Link",
			options: "Driver",
		},
		{
			fieldname: "vehicles",
			label: __("Vehicles"),
			fieldtype: "Link",
			options: "Vehicles",
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
	],
};
