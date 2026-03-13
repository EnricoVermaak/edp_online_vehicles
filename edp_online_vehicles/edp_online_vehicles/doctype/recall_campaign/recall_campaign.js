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

frappe.ui.form.on("Recall Campaign", {
    onload: function(frm) {
                frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
		    .then(r => {
		    	let labour_code_filter = r.message?.labour_code_filter || "Service Labour";
		    	frm.set_query("item", "recall_campaign_labour", () => ({
		    		filters: { item_group: labour_code_filter }
		    	}));
		    });
        },

    refresh(frm) {

		let grid = frm.fields_dict.recall_campaign_vehicles.grid;

		grid.cannot_add_rows = true;

		// refresh
		frm.refresh_field("recall_campaign_vehicles");

        // Add Model button only if it doesn't exist
        if (!grid.grid_buttons.find(".add-model-btn").length) {
        $('<button class="btn btn-xs btn-primary add-model-btn">Add Model</button>')
            .appendTo(grid.grid_buttons)
            .click(function () {

                let dialog = new frappe.ui.Dialog({
                    title: "Add Model",
                    fields: [
                        {
                            label: "Model",
                            fieldname: "model",
                            fieldtype: "Link",
                            options: "Model Administration",
                            reqd: 1
                        }
                    ],
                    primary_action_label: "Add",
					primary_action(values) {

							// let interval = frm.doc.interval;

							// let filters = {};

							// if (interval && interval !== "All") {
							// 	filters.odo_reading = ["<", parseInt(interval)];
							// }

						frappe.call({
							method: "frappe.client.get_list",
							args: {
								doctype: "Vehicle Stock",
								filters: {
									// ...filters,
									model: values.model
								},
								fields: ["vin_serial_no", "model", "series"],
								limit_page_length: 0
							},
							callback: function(r) {

								if (r.message) {

									let existing = frm.doc.recall_campaign_vehicles.map(v => v.vin_serial_no);
									let length = 0;

									r.message.forEach(vehicle => {

										if (!existing.includes(vehicle.vin_serial_no)) {

											let row = frm.add_child("recall_campaign_vehicles");

											row.vin_serial_no = vehicle.vin_serial_no;
											row.model_code = vehicle.model;
											row.series_code = vehicle.series;
											
											length += 1
										}

									});

									frm.refresh_field("recall_campaign_vehicles");

									frappe.msgprint(`${length} vehicles added`);
								}
							}
						});

						dialog.hide();
					}
                });

                dialog.show();
            });
        } // end Add Model guard

        // Add Series button only if it doesn't exist
        if (!grid.grid_buttons.find(".add-series-btn").length) {
		$('<button class="btn btn-xs btn-secondary add-series-btn">Add Series</button>')
			.appendTo(grid.grid_buttons)
			.click(function () {

				// Get all series values
				frappe.db.get_list("Model Administration", {
					fields: ["series_code"],
					limit: 0
				}).then(records => {

					// create unique list
					let series_set = [...new Set(records.map(r => r.series_code).filter(Boolean))];

					// convert to newline string for Select
					let series_options = series_set.join("\n");

					let dialog = new frappe.ui.Dialog({
						title: "Add Series",
						fields: [
							{
								label: "Series",
								fieldname: "series",
								fieldtype: "Select",
								options: series_options,
								reqd: 1
							}
						],
                    primary_action_label: "Add",
					primary_action(values) {

						// let interval = frm.doc.interval;

						// let odo_interval = {};

						// if (interval && interval !== "All") {
						// 	filters.odo_reading = ["<", parseInt(interval)];
						// }

						frappe.call({
							method: "frappe.client.get_list",
							args: {
								doctype: "Vehicle Stock",
								filters: {
									// ...filters,
									series: values.series
								},
								fields: ["vin_serial_no", "model", "series"],
								limit_page_length: 0
							},
							callback: function(r) {

								if (r.message) {

									let existing = frm.doc.recall_campaign_vehicles.map(v => v.vin_serial_no);
									let length = 0;

									r.message.forEach(vehicle => {

										if (!existing.includes(vehicle.vin_serial_no)) {

											let row = frm.add_child("recall_campaign_vehicles");

											row.vin_serial_no = vehicle.vin_serial_no;
											row.model_code = vehicle.model;
											row.series_code = vehicle.series;

											length += 1
										}

									});

									frm.refresh_field("recall_campaign_vehicles");

									frappe.msgprint(`${length} vehicles added`);
								}
							}
						});

						dialog.hide();
					}
                });

                dialog.show();
				});
			});
        } // end Add Series guard
	}
});