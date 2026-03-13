// Copyright (c) 2026, NexTash and contributors
// For license information, please see license.txt

let codeReader;
let previous_status_value = null;

$(document).ready(function () {
	frappe.require(
		"https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js",
		function () {
			codeReader = new ZXing.BrowserMultiFormatReader();
		},
	);
});

var CSM_CONFIG = {
	parts:[
	    {
	    	table: "recall_campaign_parts",
	    	childtype: "Recall Campaign Parts",
	    	item_field: "item",
            qty_field: "qty",
	    	price_field: "price",
	    	total_field: "total_excl",
	    },
    ],

    labour:[
        {
            table: "recall_campaign_labour",
            childtype: "Recall Campaign Labour",
            item_field: "item",
            duration_field: "duration_hours",
            rate_field: "rate_hour",
            total_field: "total_excl",
        },
    ],

    extras: {
		table: "recall_campaign_extras",
		childtype: "Recall Campaign Extras",
		item_field: "item",
        qty_field: "qty",
		price_field: "price",
		total_field: "total_excl",
	},

    totals: {
        parts: "parts_total_excl",
        labour: "labours_total_excl",
        extras: "extras_total_excl",
        duration: "duration_total",
    },

    labour_rate_field: "custom_warranty_labour_rate",
	company_source: "dealer",
};

edp_vehicles.pricing.bind_child_events(CSM_CONFIG);

frappe.ui.form.on("Campaign Schedule Manager", {
    onload: function(frm) {
                frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
		    .then(r => {
		    	let labour_code_filter = r.message?.labour_code_filter || "Service Labour";
		    	frm.set_query("item", "recall_campaign_labour", () => ({
		    		filters: { item_group: labour_code_filter }
		    	}));
		    });
        },
});