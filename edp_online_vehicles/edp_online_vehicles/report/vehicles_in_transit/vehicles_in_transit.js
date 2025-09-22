// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Vehicles in Transit"] = {
	filters: [
		{
			label: __("Model"),
			fieldname: "model",
			fieldtype: "Link",
			options: "Model Administration",
		},
		{
			label: __("VIN/ Serial No"),
			fieldname: "vin_serial_no",
			fieldtype: "Link",
			options: "Vehicle Stock",
		},
		{
			label: __("Dealer"),
			fieldname: "dealer",
			fieldtype: "Link",
			options: "Company",
		},
	],
};
