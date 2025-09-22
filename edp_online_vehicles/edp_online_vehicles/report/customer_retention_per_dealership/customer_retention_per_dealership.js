// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Customer Retention per Dealership"] = {
	filters: [
		{
			label: __("Range"),
			fieldname: "range",
			fieldtype: "Select",
			options: [
				{ value: "6 Months", label: __("6 Months") },
				{ value: "12 Months", label: __("12 Months") },
				{ value: "24 Months", label: __("24 Months") },
				{ value: "36 Months", label: __("36 Months") },
				{ value: "48 Months", label: __("48 Months") },
				{ value: "60 Months", label: __("60 Months") },
			],
			default: "6 Months",
		},
	],
};
