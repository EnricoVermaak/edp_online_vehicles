// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Model Administration Report"] = {
	filters: [
		{
			fieldname: "brand",
			label: __("Brand"),
			fieldtype: "Link",
			options: "Brand",
		},
	],
};
