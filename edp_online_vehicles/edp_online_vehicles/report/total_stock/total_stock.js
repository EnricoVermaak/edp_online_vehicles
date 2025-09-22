// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Total Stock"] = {
	filters: [
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "brand",
			label: __("Brand"),
			fieldtype: "Link",
			options: "Brand",
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
		{
			fieldname: "type",
			label: __("Vehicles Type"),
			fieldtype: "Link",
			options: "Vehicles Type",
		},
		{
			fieldname: "availability_status",
			label: __("Availability Status"),
			fieldtype: "Select",
			options: ["", "Available", "Reserved"],
		},
	],
};
