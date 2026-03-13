// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Retail Between Dates"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), -30),
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
			options: "Customer",
		},
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
			default: ""
		}
	],
	onload: function (report) {
		const defaultCompany = frappe.defaults.get_default("company");
		if (!defaultCompany) return;
		frappe.db.get_value("Company", defaultCompany, "custom_head_office").then(function (r) {
			if (!r || !r.custom_head_office) {
				report.set_filter_value("dealer", defaultCompany);
			}
		});
	},
};
