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

		handle_recall_vehicles_buttons(frm);

		// button to copy campaign in active state
		if (!frm.is_new()) {
			frm.add_custom_button(__("Copy Campaign"), function () {
				const new_doc = frappe.model.copy_doc(frm.doc);
				new_doc.active = 1;
				new_doc.campaign_description = "";
				frappe.set_route("Form", "Recall Campaign", new_doc.name);
			}, __("Actions"));
		}

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

									frappe.show_alert({
										message: __(`${length} vehicles added`),
										indicator: "green"
									});
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

									frappe.show_alert({
										message: __(`${length} vehicles added`),
										indicator: "green"
									});
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

function handle_recall_vehicles_buttons(frm) {
	const grid_wrapper = frm.fields_dict["recall_campaign_vehicles"]?.grid?.wrapper?.get(0);

	// Remove existing buttons to avoid duplicates on refresh
	const existing = grid_wrapper?.querySelector(".recall-vehicles-upload-download");
	if (existing) existing.remove();

	const button_container = document.createElement("div");
	button_container.className = "recall-vehicles-upload-download";
	button_container.style = "position: absolute; bottom: 0px; right: 10px; display: flex; gap: 10px;";

	// Download button
	const download_button = document.createElement("button");
	download_button.className = "btn btn-primary btn-sm";
	download_button.innerText = "Download";
	download_button.onclick = function () {
		const selected_rows = (frm.doc.recall_campaign_vehicles || []).filter(row => row.selected);
		
		let data = [];

		// Header rows
		data.push(["Template (Recall Campaign Vehicles)"]);
		data.push([]);
		data.push(["vin_serial_no"]);

		// Selected vehicle data only
		selected_rows.forEach(row => {
			data.push([row.vin_serial_no || ""]);
		});

		frappe.tools.downloadify(data, null, "Recall Campaign Vehicles");
	};

	// Upload button
	const upload_button = document.createElement("button");
	upload_button.className = "btn btn-secondary btn-sm";
	upload_button.innerText = "Upload";
	upload_button.onclick = function () {
		new frappe.ui.FileUploader({
			as_dataurl: true,
			allow_multiple: false,
			restrictions: { allowed_file_types: [".csv"] },
			on_success: async function (file) {
				const data = frappe.utils.csv_to_array(
					frappe.utils.get_decoded_string(file.dataurl)
				);

				// Find vin_serial_no column (row index 2 is fieldnames row)
				const fieldnames = data[2];
				const vin_col = fieldnames ? fieldnames.indexOf("vin_serial_no") : 0;

				const existing_vins = (frm.doc.recall_campaign_vehicles || []).map(v => v.vin_serial_no);
				const csv_vins = [];

				for (let i = 3; i < data.length; i++) {
					const vin = (data[i][vin_col] || "").trim().toUpperCase();
					if (!vin) continue;
					if (!csv_vins.includes(vin)) csv_vins.push(vin);
				}

				let stock_rows = [];
				if (csv_vins.length) {
					stock_rows = await frappe.db.get_list("Vehicle Stock", {
						filters: { vin_serial_no: ["in", csv_vins] },
						fields: ["vin_serial_no", "model", "series"],
						limit: 0
					});
				}

				const stock_map = {};
				(stock_rows || []).forEach((row) => {
					stock_map[(row.vin_serial_no || "").toUpperCase()] = row;
				});

				let added = 0;
				let missing_vins = [];

				for (let i = 3; i < data.length; i++) {
					const vin = (data[i][vin_col] || "").trim().toUpperCase();
					if (!vin) continue;
					if (existing_vins.includes(vin)) continue;

					const stock_info = stock_map[vin];
					if (!stock_info) {
						if (!missing_vins.includes(vin)) missing_vins.push(vin);
						continue;
					}

					const row = frm.add_child("recall_campaign_vehicles");
					row.vin_serial_no = vin;
					row.model_code = stock_info.model;
					row.series_code = stock_info.series;
					existing_vins.push(vin);
					added++;
				}

				frm.refresh_field("recall_campaign_vehicles");

				frappe.show_alert({
					message: __(`${added} vehicles added`),
					indicator: "green"
				});

				if (missing_vins.length) {
					frappe.msgprint({
						title: __("VINs Not Added"),
						message: __(
							"The following VINs were not added because they do not exist in Vehicle Stock:<br><br>{0}",
							[missing_vins.join("<br>")]
						),
						indicator: "orange"
					});
				}
			}
		});
		return false;
	};

	button_container.appendChild(download_button);
	button_container.appendChild(upload_button);
	grid_wrapper.appendChild(button_container);
}