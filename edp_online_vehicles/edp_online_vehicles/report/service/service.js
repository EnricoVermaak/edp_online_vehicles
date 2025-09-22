// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Service"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
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
			fieldname: "vinserial_no",
			label: __("Vin/Serial No"),
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
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_default("company"),
			reqd: 1,
		},
		{
			fieldname: "current_location",
			label: __("Current Location"),
			fieldtype: "Data",
		},
		{
			fieldname: "service_type",
			label: __("Service Type"),
			fieldtype: "Link",
			options: "Service Schedules",
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: [
				{ value: "Pending", label: __("Pending") },
				{ value: "Request Booking", label: __("Request Booking") },
				{ value: "Scheduled", label: __("Scheduled") },
				{ value: "Accepted", label: __("Accepted") },
				{
					value: "Awaiting Quote Approval",
					label: __("Awaiting Quote Approval"),
				},
				{ value: "Quote Approved", label: __("Quote Approved") },
				{ value: "Executed", label: __("Executed") },
				{ value: "Declined", label: __("Declined") },
				{ value: "Completed", label: __("Completed") },
			],
		},
	],
};
