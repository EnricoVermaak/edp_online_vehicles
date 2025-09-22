// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Model Availability"] = {
	filters: [
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
		},
	],
};
