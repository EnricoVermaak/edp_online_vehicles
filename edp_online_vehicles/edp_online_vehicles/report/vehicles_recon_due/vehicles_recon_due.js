// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Vehicles Recon Due"] = {
	filters: [
		{
			label: __("Dealer"),
			fieldname: "dealer",
			fieldtype: "Link",
			options: "Company",
		},
	],
};
