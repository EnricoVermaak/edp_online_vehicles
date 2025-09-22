// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Complete Vehicle Ageing"] = {
	filters: [
		{
			label: __("VIN/Serial No"),
			fieldname: "vin_serial_no",
			fieldtype: "Link",
			options: "Vehicle Stock",
		},
		{
			label: __("Model"),
			fieldname: "model",
			fieldtype: "Link",
			options: "Model Administration",
		},
		{
			label: __("Catagory"),
			fieldname: "catagory",
			fieldtype: "Link",
			options: "Vehicle Category",
		},
		{
			label: __("Brand"),
			fieldname: "brand",
			fieldtype: "Link",
			options: "Brand",
		},
		{
			label: __("Availability Status"),
			fieldname: "availability_status",
			fieldtype: "Select",
			options: [
				{ value: "All", label: __("All") },
				{ value: "Available", label: __("Available") },
				{ value: "Sold", label: __("Sold") },
			],
			default: "Available",
		},
	],
};
