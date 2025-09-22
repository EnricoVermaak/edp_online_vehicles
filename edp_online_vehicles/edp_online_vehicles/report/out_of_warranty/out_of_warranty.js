// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Out of Warranty"] = {
	filters: [
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
	],
};
