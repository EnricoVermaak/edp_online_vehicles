// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Services Due"] = {
	filters: [
		{
			fieldname: "date_range",
			label: __("Date Range"),
			fieldtype: "Select",
			options: [
				{ value: "6 Months", label: __("6 Months") },
				{ value: "12 Months", label: __("12 Months") },
				{ value: "18 Months", label: __("18 Months") },
				{ value: "24 Months", label: __("24 Months") },
			],
			default: "6 Months",
			reqd: 1,
		},
	],
};
