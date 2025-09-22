// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Shipment", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Receive"), function () {
				var selected_items = [];

				frm.doc["part_shipment_items"].forEach(function (row) {
					if (row.__checked) {
						if (!row.target_warehouse) {
							frappe.model.set_value(
								row.doctype,
								row.name,
								"target_warehouse",
								frm.doc.target_warehouse,
							);
						}

						if (row.part_no) {
							selected_items.push(row);
						} else {
							frappe.throw(
								"Please ensure all selected vehicles have Part No's assigned to them.",
							);
						}
					}
				});

				if (selected_items.length > 0) {
					frm.call("create_stock_entry", {
						selected_items: JSON.stringify(selected_items),
					}).then((r) => {
						if (r.message) {
							if (r.message == "Received") {
								for (let row of selected_items) {
									frappe.model.set_value(
										row.doctype,
										row.name,
										"status",
										"Received",
									);
								}
								frm.save_or_update();
							}
						}
					});
				} else {
					frappe.throw("Please Select at least One Item.");
				}
			});
		}
	},

	before_save: async function (frm) {
		let received_qty = 0;
		let invalid_parts = [];
		let errorMessage = "";

		for (const row of frm.doc["part_shipment_items"]) {
			if (row.status == "Received") {
				received_qty++;
			}

			const partExists = await frappe.db.exists("Item", row.part_no);
			if (!partExists) {
				invalid_parts.push(row.part_no);
				frappe.model.set_value(row.doctype, row.name, "part_no", null);
			}
		}

		if (received_qty == frm.doc.vehicles_shipment_items.length) {
			frm.set_value("status", "Completed");
		} else if (received_qty > 0) {
			frm.set_value("status", "Partially Received");
		}

		if (invalid_parts.length > 0) {
			const formattedParts = invalid_parts
				.map((part) => `- ${part}`)
				.join("<br>");
			errorMessage = `The following parts do not exist on the system:<br>${formattedParts}<br><br>`;
		}

		if (errorMessage) {
			frappe.throw(errorMessage);
		}
	},

	after_save(frm) {
		if (frm.doc.status == "Completed") {
			frappe.call({
				method: "edp_online_vehicles.events.submit_document.submit_part_shipment",
				args: {
					doc: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							5,
						);

						frm.refresh();
					}
				},
			});
		}
	},

	onload_post_render: function (frm) {
		handle_custom_buttons(frm);
	},

	onload: function (frm) {
		frm.set_query("target_warehouse", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];
			return {
				filters: {
					company: frm.doc.dealer,
				},
			};
		});
	},

	dealer: function (frm) {
		frm.set_query("target_warehouse", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];
			return {
				filters: {
					company: frm.doc.dealer,
				},
			};
		});
	},
});

frappe.ui.form.on("Part Shipment Items", {
	before_part_shipment_items_remove(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		let received_rows = [];

		frm.doc["part_shipment_items"].forEach(function (row) {
			if (row.__checked) {
				if (row.status == "Received") {
					received_rows.push(row);
				}
			}
		});

		if (received_rows.length > 0) {
			frappe.throw("Vehicle has been received and cannot be deleted");
		}
	},

	part_shipment_items_remove(frm) {
		calculate_sub_total(frm, "total_excl", "vehicles_shipment_items");
	},

	price_per_part_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	total_excl(frm) {
		calculate_sub_total(frm, "total_excl", "part_shipment_items");
	},
});

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.price_per_part_excl || !row.qty) return;

	let total = row.price_per_part_excl * row.qty;
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.total_excl;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

function handle_custom_buttons(frm) {
	// Remove existing buttons if present
	const grid_wrapper =
		frm.fields_dict["vehicles_shipment_items"]?.grid?.wrapper?.get(0);
	const existing_buttons = grid_wrapper?.querySelector(
		".custom-upload-download-buttons",
	);
	if (existing_buttons) {
		existing_buttons.remove();
	}

	// Check if the document is in draft state
	if (frm.doc.docstatus === 0) {
		frappe.after_ajax(() => {
			if (
				grid_wrapper &&
				!grid_wrapper.querySelector(".custom-upload-download-buttons")
			) {
				// Create a container for the buttons
				const button_container = document.createElement("div");
				button_container.className = "custom-upload-download-buttons";
				button_container.style =
					"position: absolute; bottom: 0px; right: 10px; display: flex; gap: 10px;";

				// Create Download button
				const download_button = document.createElement("button");
				download_button.className = "btn btn-primary btn-sm";
				download_button.innerText = "Download";
				download_button.onclick = function () {
					let title = "Part Shipment Items";
					let data = [];
					let docfields = [];

					// Add header rows with instructions
					data.push([__("Template", [title])]);
					data.push([]);
					data.push([]);
					data.push([]);
					data.push([__("The CSV format is case sensitive")]);
					data.push([
						__(
							"Do not edit headers which are preset in the template",
						),
					]);
					data.push(["------"]);

					// Define metadata for child table fields
					$.each(
						frappe.get_meta("Part Shipment Items").fields,
						(i, df) => {
							if (frappe.model.is_value_type(df.fieldtype)) {
								data[1].push(df.label); // Add field label to the header row
								data[2].push(df.fieldname); // Add fieldname for mapping
								let description = (df.description || "") + " ";
								if (df.fieldtype === "Date") {
									description +=
										frappe.boot.sysdefaults.date_format; // Add date format for Date fields
								}
								data[3].push(description); // Add description row
								docfields.push(df); // Store metadata
							}
						},
					);

					// Add existing data from the child table
					$.each(
						cur_frm.doc.vehicles_shipment_items || [],
						(i, d) => {
							let row = [];
							$.each(data[2], (i, fieldname) => {
								let value = d[fieldname];

								// Format date fields
								if (
									docfields[i].fieldtype === "Date" &&
									value
								) {
									value = frappe.datetime.str_to_user(value); // Format to user-readable date
								}

								row.push(value || ""); // Add value or empty string
							});
							data.push(row); // Append row to the data
						},
					);

					// Trigger download
					frappe.tools.downloadify(data, null, title);
				};

				// Create Upload button
				const upload_button = document.createElement("button");
				upload_button.className = "btn btn-secondary btn-sm";
				upload_button.innerText = "Upload";
				upload_button.onclick = function () {
					const value_formatter_map = {
						Date: (val) =>
							val ? frappe.datetime.user_to_str(val) : val,
						Int: (val) => cint(val),
						Check: (val) => cint(val),
						Float: (val) => flt(val),
						Currency: (val) => flt(val),
					};

					new frappe.ui.FileUploader({
						as_dataurl: true,
						allow_multiple: false,
						restrictions: {
							allowed_file_types: [".csv"], // Restrict to CSV files
						},
						on_success(file) {
							// Parse the uploaded CSV data
							const data = frappe.utils.csv_to_array(
								frappe.utils.get_decoded_string(file.dataurl),
							);

							// The 2nd row contains the fieldnames
							const fieldnames = data[2];

							// Clear existing rows in the child table
							cur_frm.clear_table("part_shipment_items");

							// Process rows from the uploaded file
							let rowIndex = 7; // Start after the metadata/header rows

							function processRow(rowIndex) {
								if (rowIndex < data.length) {
									let row = data[rowIndex];

									// Check if the row is blank
									let blank_row = true;
									$.each(row, function (ci, value) {
										if (value) {
											blank_row = false;
											return false;
										}
									});

									if (!blank_row) {
										const d = cur_frm.add_child(
											"part_shipment_items",
										);
										$.each(row, (ci, value) => {
											const fieldname = fieldnames[ci];
											const df = frappe.meta.get_docfield(
												"Part Shipment Items",
												fieldname,
											);
											if (df) {
												d[fieldname] =
													value_formatter_map[
														df.fieldtype
													]
														? value_formatter_map[
																df.fieldtype
															](value)
														: value;
											}
										});

										// Refresh the child table to reflect changes
										cur_frm.refresh_field(
											"part_shipment_items",
										);

										// Move to the next row after adding the current one
										processRow(rowIndex + 1);
									} else {
										// If the row is blank, skip it and move to the next one
										processRow(rowIndex + 1);
									}
								} else {
									// Once all rows have been processed, notify the user
									frappe.msgprint({
										message: __(
											"Table updated successfully",
										),
										title: __("Success"),
										indicator: "green",
									});
								}
							}

							// Start processing the first row
							processRow(rowIndex);
						},
					});

					return false;
				};

				// Append buttons to the container
				button_container.appendChild(download_button);
				button_container.appendChild(upload_button);

				// Append the button container to the child table grid
				grid_wrapper.appendChild(button_container);
			}
		});
	}
}
