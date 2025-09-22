// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Request For Service Report"] = {
	filters: [
		{
			fieldname: "vin_serial_no",
			label: __("VIN/Serial No"),
			fieldtype: "Link",
			options: "Vehicle Stock",
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "rfs_status",
			label: __("RFS Status"),
			fieldtype: "Select",
			options: [
				"All",
				"Pending",
				"Awaiting Quote Approval",
				"Quote Approved",
				"In Progress",
				"Invoiced",
				"Invoice Approved",
				"Paid",
				"Cancelled",
				"Rejected",
			],
			default: "All",
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), -1),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
	],
};
