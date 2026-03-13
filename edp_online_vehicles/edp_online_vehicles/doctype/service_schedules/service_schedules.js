// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

var SS_CONFIG = {
    parts: [{
        table: "service_parts_items",
        childtype: "Service Schedules Parts Items",
        item_field: "item",
        price_field: "price_excl",
        qty_field: "qty",
        total_field: "total_excl",
        gp_field: "custom_service_gp",
        apply_gp: true,
    }],
    labour: [{
        table: "service_labour_items",
        childtype: "Service Schedules Labour Items",
        item_field: "item",
        rate_field: "rate_hour",
        duration_field: "duration_hours",
        total_field: "total_excl",
        gp_field: "custom_service_gp",
        apply_gp: true,
    }],
    totals: {
        parts: "custom_parts_total_excl",
        labour: "custom_labours_total_excl",
    },
    labour_rate_field: "custom_service_labour_rate",
    company_source: "user_default",
};

edp_vehicles.pricing.bind_child_events(SS_CONFIG);

frappe.ui.form.on("Service Schedules", {
    onload(frm) {
        frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
		    .then(r => {
		    	let labour_code_filter = r.message?.labour_code_filter || "Service Labour";
		    	frm.set_query("item", "service_labour_items", () => ({
		    		filters: { item_group: labour_code_filter }
		    	}));
		    });
    },
    refresh(frm) {
        edp_vehicles.pricing.recalc_totals(frm, SS_CONFIG);
    }
});
