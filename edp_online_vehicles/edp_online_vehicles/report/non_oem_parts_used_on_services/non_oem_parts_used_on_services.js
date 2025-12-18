// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.query_reports["Non OEM Parts Used on Services"] = {
        "filters": [
        {
            "fieldname": "vin_serial_no",
            "label": "VIN Serial No",
            "fieldtype": "Link",
            "options": "Vehicle Stock"
        },
		{
            "fieldname": "dealer",
            "label": "Dealer",
            "fieldtype": "Link",
            "options": "Company"
        },
        {
            "fieldname": "from_date",
            "label": "From Date",
            "fieldtype": "Date"
        },
        {
            "fieldname": "to_date",
            "label": "To Date",
            "fieldtype": "Date"
        }
    ],

    "onload": function(report) {
        // Optional onload logic
    },

    "formatter": function(value, row, column, data, default_formatter) {
        return default_formatter(value, row, column, data);
    },
};
