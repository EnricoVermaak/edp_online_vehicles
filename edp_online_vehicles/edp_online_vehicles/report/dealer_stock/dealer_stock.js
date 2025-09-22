// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.call({
	method: "edp_online_vehicles.events.get_hq_company.get_hq_company",
	callback: function (r) {
		if (r.message) {
			let company = frappe.defaults.get_default("company");

			if (company == r.message) {
				frappe.query_reports["Dealer Stock"] = {
					filters: [
						{
							fieldname: "dealer",
							label: __("Dealer"),
							fieldtype: "Link",
							options: "Company",
							default: frappe.defaults.get_default("company"),
							reqd: 1,
						},
						{
							fieldname: "availability_status",
							label: __("Availability Status"),
							fieldtype: "Select",
							options: ["", "Available", "Reserved"],
						},
						{
							fieldname: "show_dealer_full_stock_report",
							label: __("Show Dealer Full Stock Report"),
							fieldtype: "Check",
						},
					],
				};
			} else {
				frappe.query_reports["Dealer Stock"] = {
					filters: [
						{
							fieldname: "dealer",
							label: __("Dealer"),
							fieldtype: "Link",
							options: "Company",
							default: frappe.defaults.get_default("company"),
							reqd: 1,
						},
						{
							fieldname: "availability_status",
							label: __("Availability Status"),
							fieldtype: "Select",
							options: ["", "Available", "Reserved"],
						},
					],
				};
			}
		}
	},
});
