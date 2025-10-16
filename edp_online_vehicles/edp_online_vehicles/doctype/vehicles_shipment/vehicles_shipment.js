// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let stockNo = "";

frappe.ui.form.on("Vehicles Shipment", {
	refresh(frm) {
		frm.set_query("target_warehouse", () => {
			return {
				filters: {
					is_group: 0,
				},
			};
		});

		if (!frm.doc.target_warehouse) {
			frappe.db
				.get_single_value(
					"Vehicle Stock Settings",
					"set_default_warehouse",
				)
				.then((default_warehouse) => {
					if (default_warehouse) {
						frm.set_value("target_warehouse", default_warehouse);
					}
				});
		}

		if (!frm.doc.__islocal && frm.doc.docstatus === 0) {
			frm.add_custom_button(__("Receive"), function () {
				frappe.dom.freeze();

				var selected_items = [];
				var promises = [];

				frm.doc["vehicles_shipment_items"].forEach(function (row) {
					if (row.__checked) {
						if (!row.target_warehouse) {
							frappe.model.set_value(
								row.doctype,
								row.name,
								"target_warehouse",
								frm.doc.target_warehouse,
							);
						}

						if (!row.colour) {
							frappe.throw(
								"Please ensure all selected vehicles have colours assigned to them.",
							);
						}

						if (row.vin_serial_no) {
							const promise = frappe.db
								.get_doc("Vehicle Stock Settings")
								.then((setting_doc) => {
									if (
										setting_doc.automatically_create_stock_number
									) {
										var lastStockNo = stockNo;

										const nextStockNo =
											incrementStockNumber(lastStockNo);
										console.log(nextStockNo);

										frappe.model.set_value(
											row.doctype,
											row.name,
											"stock_no",
											nextStockNo,
										);
									}

									selected_items.push(row);
								});
							promises.push(promise);
						} else {
							frappe.throw(
								"Please ensure all selected vehicles have VIN/Serial No's assigned to them.",
							);
						}
					}
				});

				// Wait for all promises to resolve
				Promise.all(promises).then(() => {
					//Update Stockno counter in Vehicle Stock Settings
					frappe.call({
						method: "edp_online_vehicles.events.update_stock_settings.update_stock_no",
						args: {
							stockNo: stockNo,
						},
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

									frappe.dom.unfreeze();

									frm.save_or_update();

									const host = window.location.hostname;
									const isMahindra = [
										"msademo.edponline.co.za",
										"msa.edponline.co.za",
										"localhost",
									].includes(host);

									if (isMahindra) {
										frappe.call({
											method: "edp_online_vehicles.events.tac_integration.tac_landing_outgoing",
											args: {
												selected_items:
													JSON.stringify(
														selected_items,
													),
											},
										});
									}
								}
							}
						});
					} else {
						frappe.dom.unfreeze();
						frappe.throw("Please Select at least One Item.");
					}
				});
			});

			frm.add_custom_button(__("Reserve"), function () {
				let selectedRows = frm.doc["vehicles_shipment_items"].filter(
					(row) => row.__checked,
				);

				if (selectedRows.length === 0) {
					frappe.throw("Please select at least one item.");
				}
				if (selectedRows.length > 1) {
					frappe.throw("Please select only one vehicle.");
				}

				let selectedRow = selectedRows[0];

				if (!selectedRow.colour) {
					frappe.throw(
						"Please ensure the selected vehicle has a colour assigned.",
					);
				}
				if (!selectedRow.vin_serial_no) {
					frappe.throw(
						"Please ensure the selected vehicle has a VIN/Serial No assigned.",
					);
				}
				if (!selectedRow.target_warehouse) {
					frappe.model.set_value(
						selectedRow.doctype,
						selectedRow.name,
						"target_warehouse",
						frm.doc.target_warehouse,
					);
				}

				let vinno = selectedRow.vin_serial_no;
				let model = selectedRow.model_code;
				let colour = selectedRow.colour;
				let dealer = frm.doc.dealer;

				const dialog = new frappe.ui.Dialog({
					title: __("Reserve Stock"),
					fields: [
						{
							label: __("Dealer"),
							fieldname: "dealer",
							fieldtype: "Link",
							options: "Company",
							default: dealer,
							read_only: 1,
						},
						{
							label: __("Customer"),
							fieldname: "customer",
							fieldtype: "Link",
							options: "Dealer Customer",
						},
						{
							label: __("Status"),
							fieldname: "status",
							fieldtype: "Select",
							options: ["Reserved"],
							default: "Reserved",
							read_only: 1,
						},
						{
							label: __("Reserve Reason"),
							fieldname: "reserve_reason",
							fieldtype: "Small Text",
							reqd: 1,
						},
						{
							label: __("Reserve From Date"),
							fieldname: "reserve_from_date",
							fieldtype: "Date",
							default: frappe.datetime.get_today(),
							reqd: 1,
						},
						{
							label: __("Reserve To Date"),
							fieldname: "reserve_to_date",
							fieldtype: "Date",
						},
						{
							label: __("Vehicles"),
							fieldname: "selected_Vehicles",
							fieldtype: "Table",
							read_only: 1,
							cannot_add_rows: false,
							in_place_edit: false,
							fields: [
								{
									fieldname: "vin_serial_no",
									fieldtype: "Link",
									in_list_view: 1,
									label: "VIN/ Serial No",
									options: "Vehicle Stock",
									read_only: 1,
								},
							],
							data: [
								{
									vin_serial_no: vinno,
								},
							],
						},
					],
					primary_action_label: __("Reserve"),
					primary_action(values) {
						let order = values.back_order;

						if (
							values.reserve_to_date &&
							values.reserve_to_date < values.reserve_from_date
						) {
							frappe.msgprint(
								__(
									"Reserve To Date cannot be earlier than Reserve From Date.",
								),
							);
							return;
						}

						frappe.call({
							method: "edp_online_vehicles.events.create_reserve_doc.create_shipment_reserve_doc",
							args: {
								vinno: vinno,
								dealer: values.dealer,
								customer: values.customer,
								reserve_reason: values.reserve_reason,
								reserve_from_date: values.reserve_from_date,
								reserve_to_date: values.reserve_to_date,
								head_office_vehicle_order: order,
							},
							callback: function (response) {
								frm.doc["vehicles_shipment_items"].forEach(
									(row) => {
										if (row.__checked) {
											row.reserve_to_order = order;
											return;
										}
									},
								);

								frm.save();
							},
						});

						dialog.hide();
					},
				});

				dialog.show();
			});
		}

		frm.set_query(
			"colour",
			"vehicles_shipment_items",
			function (doc, cdt, cdn) {
				let d = locals[cdt][cdn];
				return {
					filters: {
						model: d.model_code,
					},
				};
			},
		);

		frm.set_query(
			"model_code",
			"vehicles_shipment_items",
			function (doc, cdt, cdn) {
				let d = locals[cdt][cdn];
				return {
					filters: {
						mark_as_discontinued: 0,
					},
				};
			},
		);

		frm.set_query(
			"reserve_to_order",
			"vehicles_shipment_items",
			function (doc, cdt, cdn) {
				let d = locals[cdt][cdn];
				return {
					query: "edp_online_vehicles.events.custom_queries.back_order_custom_qry",
					filters: {
						model: d.model_code,
						colour: d.colour,
					},
				};
			},
		);

		// frm.fields_dict['order_no'].df.onchange = function() {
		//     let value = frm.doc.your_link_field;
		//     if (value) {
		//         frappe.msgprint(__('You selected: ' + value));
		//     }
		// };

		frappe.db.get_doc("Vehicle Stock Settings").then((setting_doc) => {
			if (setting_doc.automatically_create_stock_number) {
				stockNo = setting_doc.last_automated_stock_no;

				console.log(stockNo);
			}
		});
	},
	before_save: async function (frm) {
		let received_qty = 0;
		let vin_list = [];
		let invalid_models = [];
		let duplicate_vins = [];
		let vin_seen = new Set();
		let vin_shipment_check_message = "";

		// First pass: Count occurrences of each VIN
		let vin_counts = {};
		frm.doc["vehicles_shipment_items"].forEach((row) => {
			if (row.vin_serial_no) {
				const vin = row.vin_serial_no.toUpperCase();
				vin_counts[vin] = (vin_counts[vin] || 0) + 1;
			}
		});

		// Second pass: Process rows
		for (const row of frm.doc["vehicles_shipment_items"]) {
			// Increment received quantity if status is "Received"
			if (row.status == "Received") {
				received_qty++;
			}

			// Convert vin_serial_no and engine_no to uppercase if present
			if (row.vin_serial_no) {
				row.vin_serial_no = row.vin_serial_no.toUpperCase();

				// Check for duplicates
				if (vin_counts[row.vin_serial_no] > 1) {
					if (vin_seen.has(row.vin_serial_no)) {
						// It's a duplicate; clear the value
						duplicate_vins.push(row.vin_serial_no);
						frappe.model.set_value(
							row.doctype,
							row.name,
							"vin_serial_no",
							null,
						);
					} else {
						// Mark as seen
						vin_seen.add(row.vin_serial_no);
					}
				}
			}

			if (row.engine_no) {
				row.engine_no = row.engine_no.toUpperCase();
			}

			// Check if model_code exists
			const modelExists = await frappe.db.exists(
				"Model Administration",
				row.model_code,
			);
			if (!modelExists) {
				invalid_models.push(row.model_code);
				frappe.model.set_value(
					row.doctype,
					row.name,
					"model_code",
					null,
				);
			}

			if (row.vin_serial_no) {
				vin_list.push(row.vin_serial_no);
			}
		}

		if (vin_list.length > 0) {
			await frappe.call({
				method: "edp_online_vehicles.events.custom_queries.shipment_vin_serial_check",
				args: {
					vin_serial_no: JSON.stringify(vin_list),
					shipment_name: frm.doc.name,
				},
				callback: function (response) {
					if (response.message) {
						// Generate the VIN shipment message
						vin_shipment_check_message = response.message
							.map(
								(entry) =>
									`- ${entry.vin_serial_no}: ${entry.shipment_name}`,
							)
							.join("<br>");
					}
				},
			});
		}

		// Update the status based on received_qty
		if (received_qty == frm.doc.vehicles_shipment_items.length) {
			frm.set_value("status", "Completed");
		} else if (received_qty > 0) {
			frm.set_value("status", "Partially Received");
		}

		// Prepare error messages
		let errorMessage = "";

		if (invalid_models.length > 0) {
			const formattedModels = invalid_models
				.map((model) => `- ${model}`)
				.join("<br>");
			errorMessage += `The following models do not exist in Model Administration:<br>${formattedModels}<br><br>`;
		}

		if (duplicate_vins.length > 0) {
			const formattedVins = [...new Set(duplicate_vins)]
				.map((vin) => `- ${vin}`)
				.join("<br>");
			errorMessage += `The following VINs are duplicated in the table:<br>${formattedVins}<br><br>`;
		}

		if (vin_shipment_check_message) {
			errorMessage += `The following VIN numbers are present in other shipments:<br>${vin_shipment_check_message}<br><br>`;
		}

		if (errorMessage) {
			frappe.throw(errorMessage);
		}
	},

	after_save(frm) {
		if (frm.doc.status == "Completed") {
			console.log(frm.doc.name);

			frappe.call({
				method: "edp_online_vehicles.events.submit_document.submit_shipment_document",
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

frappe.ui.form.on("Vehicles Shipment Items", {
	before_vehicles_shipment_items_remove(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		let received_rows = [];

		frm.doc["vehicles_shipment_items"].forEach(function (row) {
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

	model_code(frm, cdt, cdn) {
		const row = locals[cdt][cdn];

		if (row.model_code) {
			let target_warehouse = frm.doc.target_warehouse;

			if (target_warehouse) {
				frappe.model.set_value(
					cdt,
					cdn,
					"target_warehouse",
					target_warehouse,
				);
			} else {
				frappe.msgprint(__("No Target Warehouse data available"));
				frappe.model.set_value(cdt, cdn, "model_code", null);
			}
		}
	},

	vehicles_shipment_items_remove(frm) {
		calculate_sub_total(frm, "total_excl", "vehicles_shipment_items");
	},

	cost_price_excl(frm) {
		calculate_sub_total(frm, "total_excl", "vehicles_shipment_items");
	},

});

const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.cost_price_excl;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

function handle_custom_buttons(frm) {
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
					let title = "Vehicle Shipment Items";
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
						frappe.get_meta("Vehicles Shipment Items").fields,
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
							cur_frm.clear_table("vehicles_shipment_items");

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
										// Get model and colour
										const model = row[0];
										const colour = row[11];

										// Create the formatted Model Colour name
										const model_colour_name =
											colour + " - " + model;

										// Check if the colour exists for the model
										frappe.db
											.exists(
												"Model Colour",
												model_colour_name,
											)
											.then(function (exists) {
												if (exists) {
													// Add a new row to the child table if the colour exists
													const d = cur_frm.add_child(
														"vehicles_shipment_items",
													);
													$.each(row, (ci, value) => {
														const fieldname =
															fieldnames[ci];
														const df =
															frappe.meta.get_docfield(
																"Vehicles Shipment Items",
																fieldname,
															);
														if (df) {
															d[fieldname] =
																value_formatter_map[
																	df.fieldtype
																]
																	? value_formatter_map[
																			df
																				.fieldtype
																		](value)
																	: value;
														}
													});

													// Set the colour field to the model_colour_name (link to Model Colour)
													d.colour =
														model_colour_name;

													// Refresh the child table to reflect changes
													cur_frm.refresh_field(
														"vehicles_shipment_items",
													);

													// Move to the next row after adding the current one
													processRow(rowIndex + 1);
												} else {
													// If the colour does not exist, create the color first
													frappe.call({
														method: "frappe.client.insert",
														args: {
															doc: {
																doctype:
																	"Model Colour",
																colour: colour,
																model: model,
															},
														},
														callback: function (r) {
															if (r.message) {
																// After color is created, add the row to the child table
																const d =
																	cur_frm.add_child(
																		"vehicles_shipment_items",
																	);
																$.each(
																	row,
																	(
																		ci,
																		value,
																	) => {
																		const fieldname =
																			fieldnames[
																				ci
																			];
																		const df =
																			frappe.meta.get_docfield(
																				"Vehicles Shipment Items",
																				fieldname,
																			);
																		if (
																			df
																		) {
																			d[
																				fieldname
																			] =
																				value_formatter_map[
																					df
																						.fieldtype
																				]
																					? value_formatter_map[
																							df
																								.fieldtype
																						](
																							value,
																						)
																					: value;
																		}
																	},
																);

																// Set the colour field to the model_colour_name (link to Model Colour)
																d.colour =
																	model_colour_name;

																// Refresh the child table to reflect changes
																cur_frm.refresh_field(
																	"vehicles_shipment_items",
																);

																// Move to the next row after the current one is done
																processRow(
																	rowIndex +
																		1,
																);
															} else {
																// Notify user of failure to create color
																frappe.msgprint(
																	{
																		message:
																			__(
																				"Failed to create color '" +
																					model_colour_name +
																					"'.",
																			),
																		title: __(
																			"Error",
																		),
																		indicator:
																			"red",
																	},
																);

																// Move to the next row if color creation fails
																processRow(
																	rowIndex +
																		1,
																);
															}
														},
													});
												}
											});
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

function incrementStockNumber(stockNumber) {
	// Split the prefix and number part
	const prefix = stockNumber.match(/[A-Za-z]+/)[0];
	const number = stockNumber.match(/\d+/)[0];

	// Increment the numeric part
	const incrementedNumber = (parseInt(number, 10) + 1)
		.toString()
		.padStart(6, "0");

	// Combine prefix and incremented number
	return prefix + incrementedNumber;
}
