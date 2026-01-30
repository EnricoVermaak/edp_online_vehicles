// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt



let previous_status_value = null;
let codeReader;

$(document).ready(function () {
	frappe.require(
		"https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js",
		function () {
			codeReader = new ZXing.BrowserMultiFormatReader();
			console.log("ZXing library loaded");
		},
	);
});

frappe.ui.form.on("Vehicles Warranty Claims", {
	refresh(frm) {
		setTimeout(() => reapply_colors(frm), 300);
		frm.add_custom_button(
			__("Sales Order"),
			() => {
				if (!frm.doc.parts.length > 0) {
					frappe.throw(
						"Please Enter data in parts child table first",
					);
				} else if (!frm.doc.part_schedule_date) {
					frappe.throw(
						"Please select a Scheduled Delivery Date under Parts Table",
					);
				} else {
					frappe.call({
						method: "edp_online_vehicles.events.create_sales_order.create_sales_order_warranty",
						args: {
							docname: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(r.message);
							}
						},
					});
				}
			},
			__("Create"),
		);

		frm.add_custom_button(
			"Material Request",
			() => {
				if (
					!frm.doc.service_parts_items.length > 0 &&
					!frm.doc.service_labour_items.length > 0
				) {
					frappe.throw("Please Enter data in child tables first");
				} else if (!frm.doc.part_schedule_date) {
					frappe.throw(
						"Please select a Scheduled Delivery Date under Parts Table",
					);
				} else {
					frappe.call({
						method: "edp_online_vehicles.events.create_material_request.create_material_request_warranty",
						args: {
							docname: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(r.message);
							}
						},
					});
				}
			},
			"Create",
		);

		frm.add_custom_button(
			"Internal Docs and Notes",
			() => {
				console.log(frm);

				frappe.model.open_mapped_doc({
					method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_warranty_claims.vehicles_warranty_claims.create_internal_docs_notes",
					frm: frm,
				});
			},
			"Create",
		);

		frm.add_custom_button("Scan", () => {
			// Create a new instance of ZXing's BrowserMultiFormatReader each time the dialog is opened
			let codeReader = new ZXing.BrowserMultiFormatReader();

			// Create a dialog to show the video feed and scanned result
			let d = new frappe.ui.Dialog({
				title: "Scan",
				fields: [
					{
						label: "Camera Feed",
						fieldname: "camera_feed",
						fieldtype: "HTML",
					},
				],
				primary_action_label: "Close",
				primary_action() {
					// On dialog close, stop the scanning and clear the video container
					d.hide();
					codeReader.reset();
					d.get_field("camera_feed").$wrapper[0].innerHTML = "";
				},
			});
			d.show();

			// Clear any previous content and insert a fresh video element
			const cameraContainer = d.get_field("camera_feed").$wrapper[0];
			cameraContainer.innerHTML =
				'<video id="video" width="100%" height="300px" autoplay muted></video>';

			// Start decoding from the video stream.
			codeReader.decodeFromVideoDevice(null, "video", (result, err) => {
				if (result) {
					// Barcode detected: extract text
					let scannedText = result.getText();

					// Try to split by "%" for the legacy format
					let segments = scannedText
						.split("%")
						.filter((s) => s.trim() !== "");

					// If segments indicate the legacy (percent-separated) format, use that
					if (segments.length >= 14) {
						let vin = segments[11]; // per your current logic

						frappe.call({
							method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
							args: { vinno: vin },
							callback: function (r) {
								if (r.message) {
									let colour = segments[10];
									let license_no = segments[5];
									let license_expiry_date = segments[13];
									let engine_no = segments[12];
									let veh_reg_no = segments[6];
									let brand = segments[8];
									frm.set_value("vin_serial_no", vin).then(
										() => {
											frm.set_value(
												"engine_no",
												engine_no,
											);
											frm.set_value("colour", colour);
											frm.set_value("brand", brand);
										},
									);
									frm.set_value("license_no", license_no);
									frm.set_value(
										"license_expiry_date",
										license_expiry_date,
									);
									frm.set_value(
										"vehicle_registration_number",
										veh_reg_no,
									);
								} else {
									frappe.db
										.get_value(
											"Company",
											{ name: frm.doc.dealer },
											"custom_allow_any_brand_for_dealership",
										)
										.then((res) => {
											if (
												res.message
													.custom_allow_any_brand_for_dealership
											) {
												frappe.call({
													method: "edp_online_vehicles.events.service_methods.create_vehicle",
													args: {
														vinno: vin,
														colour: segments[10],
														license_no: segments[5],
														license_expiry_date:
															segments[13],
														engine_no: segments[12],
														veh_reg_no: segments[6],
														brand: segments[8],
													},
													callback: function (r) {
														if (r.message) {
															frappe.show_alert(
																{
																	message: __(
																		"Vehicle successfully created",
																	),
																	indicator:
																		"green",
																},
																20,
															);
														} else {
															frappe.show_alert(
																{
																	message: __(
																		"Failed to create Vehicle. Please contact support: support@tecwise.co.za",
																	),
																	indicator:
																		"red",
																},
																20,
															);
														}
													},
												});
											} else {
												frappe.show_alert(
													{
														message: __(
															"The scanned Vehicle does not exist on the system. Please contact head office and ask them to load the vehicle on the system.",
														),
														indicator: "orange",
													},
													15,
												);
											}
										});
								}
							},
						});
					}
					// Otherwise, check if the scanned text is a URL
					else {
						try {
							let urlObj = new URL(scannedText);
							// Extract the last segment of the pathname
							let pathSegments = urlObj.pathname
								.split("/")
								.filter((s) => s !== "");
							if (pathSegments.length > 0) {
								let vin = pathSegments[pathSegments.length - 1];
								frappe.call({
									method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
									args: { vinno: vin },
									callback: function (r) {
										if (r.message) {
											frm.set_value("vin_serial_no", vin);
										} else {
											console.log(vin);

											frappe.show_alert(
												{
													message: __(
														"Vin/Serial No not on system. Please contact Head Office.",
													),
													indicator: "red",
												},
												20,
											);
										}
									},
								});
							} else {
								frappe.msgprint("Vin/Serial No not recognised");
							}
						} catch (e) {
							frappe.msgprint("Barcode format not recognized.");
						}
					}
					// Close the dialog and stop scanning immediately upon success
					d.hide();
					codeReader.reset();
					cameraContainer.innerHTML = "";
				}
				// Ignore NotFoundException errors which are expected if no barcode is in view
				if (err && !(err instanceof ZXing.NotFoundException)) {
					console.error(err);
					frappe.msgprint("Scanning error: " + err);
				}
			});
		});
	},
	onload: function (frm) {

		frm.fields_dict['part_items'].grid.get_field('part_no').get_query = function (doc, cdt, cdn) {
			return {
				filters: {
					"item_group": "Parts"
				}
			}
		};
		if (frm.doc.vehicles_incidents) {
			frappe.db
				.get_doc("Vehicles Incidents", frm.doc.vehicles_incidents)
				.then((doc) => {
					for (let row of doc.parts) {
						frm.add_child("part_items", {
							part_no: row.item || "",
							description: row.description || "",
							qty: row.qty || 0,
							price: row.price_excl || 0,
							uom: row.uom || "",
						});
						frm.refresh_field("part_items");

						frm.set_value("total_excl", doc.parts_total);
					}
				});
		}

		// Reset the field to its previous status if no new value is selected
		$(document).on("blur", '[data-fieldname="status"]', function () {
			// Check if the value is empty (or remains unchanged)
			if (!frm.doc.status || frm.doc.status === "") {
				frm.set_value("status", previous_status_value);
			}
		});

		// $(document).on('click', '[data-fieldname="status"]', function() {
		//   frm.set_value('status', '');
		// });

		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");

			frappe.db
				.get_list("Warranty Status", {
					filters: {
						is_default_status: 1,
					},
					fields: ["name"],
				})
				.then((war_status) => {
					if (war_status.length > 0) {
						frm.set_value("status", war_status[0].name);
					}
				});
		}
		previous_status_value = frm.doc.status;
	},
	odo_reading: function (frm) {
		// Validate Odo Reading when it changes (if VIN is set)
		if (frm.doc.vin_serial_no) {
			validate_odo_reading(frm);
		}
	},
	vin_serial_no: function (frm) {
		if (frm.doc.part_items && frm.doc.part_items.length > 0) {
			setTimeout(() => reapply_colors(frm), 400);
		}

		// if (frm.doc.odo_reading) {
		// 	frappe.db.get_doc("Vehicle Stock", frm.doc.vin_serial_no)
		// 		.then(vehicle => {

		// 			let odo = frm.doc.odo_reading;
		// 			let isValid = false;

		// 			if (vehicle.table_pcgj && vehicle.table_pcgj.length > 0) {
		// 				console.log(vehicle.table_pcgj);


		// 				vehicle.table_pcgj.forEach(row => {
		// 					let maxLimit = row.warranty_odo_limit || 0;

		// 					if (odo >= 0 && odo <= maxLimit) {
		// 						isValid = true;
		// 					}
		// 				});
		// 			}

		// 			if (!isValid) {
		// 				frappe.msgprint("Odometer reading is outside the warranty limit!");
		// 			}
		// 		});
		// }
		if (!frm.doc.vin_serial_no) return;

		// Validate Odo Reading when VIN changes (if Odo is already set)
		if (frm.doc.odo_reading) {
			validate_odo_reading(frm);
		}


		if (frm.is_new()) {
			frappe.db
				.get_list("Vehicle Stock", {
					filters: {
						vin_serial_no: frm.doc.vin_serial_no,
						availability_status: "Stolen",
					},
					fields: ["name"],
				})
				.then((existing_services) => {
					if (existing_services.length > 0) {
						frm.set_value("vin_serial_no", null);
						frappe.throw(
							"This vehicles was reported as stolen. Please contact Head Office immediately for more information",
						);
					} else {
						let seven_days_ago = frappe.datetime.add_days(
							frappe.datetime.get_today(),
							-7,
						);

						frappe.db
							.get_list("Vehicles Warranty Claims", {
								filters: {
									vin_serial_no: frm.doc.vin_serial_no,
									creation: [">=", seven_days_ago],
								},
								fields: ["name"],
							})
							.then((existing_services) => {
								if (existing_services.length > 0) {
									frappe.msgprint(
										"Please be aware that a service request for this vehicle has been submitted within the last 7 days.",
									);
								}
							});
					}
				});
		}
		frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
			if (convert_out_of_warranty_to_goodwill) {
				// Validate warranty period when VIN changes
				if (frm.doc.vin_serial_no && frm.doc.type !== "Goodwill") {
					frappe.call({
						method: "edp_online_vehicles.events.service_type.check_warranty_date",
						args: {
							vin: frm.doc.vin_serial_no,
						},
						callback(r) {
							if (!r.message) return;

							if (!r.message.is_valid) {
								if (frm.doc.type !== "Goodwill") {
									frm.set_value("type", "Goodwill");
								}

								frappe.msgprint(
									"Please note the selected vehicle falls outside the allocated warranty period parameters. Please contact Head Office for more information"
								);
							}
						},
					});
				}

			}
		})
	},
	after_save(frm) {
		setTimeout(() => reapply_colors(frm), 400);
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.warranty_status_change",
			args: {
				vinno: frm.doc.vin_serial_no,
				status: frm.doc.status,
			},
			callback: function (r) {
				if (r.message) {
					frappe.msgprint(r.message);
				}
			},
		});
		frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
			if (convert_out_of_warranty_to_goodwill) {

				if (frm.doc.vin_serial_no && frm.doc.type !== "Goodwill") {
					frappe.call({
						method: "edp_online_vehicles.events.service_type.check_warranty_date",
						args: {
							vin: frm.doc.vin_serial_no,
						},
						callback(r) {
							if (!r.message) return;

							if (!r.message.is_valid) {

								if (frm.doc.type !== "Goodwill") {
									frm.set_value("type", "Goodwill");
								}

								frappe.msgprint(
									"Please note the selected vehicle falls outside the allocated warranty period parameters. Please contact Head Office for more information"
								);
							}

						},
					});
				};
			}
		})
	},
});

// Function to validate Odo Reading against warranty KM limit
function validate_odo_reading(frm) {
	// Need both VIN and Odo Reading to validate
	if (!frm.doc.vin_serial_no || !frm.doc.odo_reading) {
		return;
	}
	frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
		if (convert_out_of_warranty_to_goodwill) {
			frappe.db.get_doc("Vehicle Stock", frm.doc.vin_serial_no).then(vehicle => {
				if (!vehicle.warranty_km_hours_limit) {
					// No warranty KM limit set, skip validation
					return;
				}

				if (frm.doc.odo_reading > vehicle.warranty_km_hours_limit) {
					// Odo exceeds limit - change to Goodwill (only if not already Goodwill)
					if (frm.doc.type !== "Goodwill") {
						frm.set_value("type", "Goodwill");
						frappe.msgprint({
							message: "Please note the selected vehicle Odo Reading falls outside the allocated warranty plan parameters. Please contact Head Office for more information",
							indicator: "orange"
						});
					}
				} else {
					// Odo is within limit - change back to Normal if currently Goodwill
					if (frm.doc.type === "Goodwill") {
						frm.set_value("type", "Normal");
					}
				}
			});
		}
	})


}
frappe.ui.form.on('Warranty Part Item', {
	part_no: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.part_no) return;

		// 1) Get Item Doc
		frappe.db.get_doc('Item', row.part_no).then(item_doc => {

			// Block non-parts items
			if (item_doc.item_group !== "Parts") {
				frappe.msgprint({
					title: __('Error'),
					message: __('Selected item is not a Part. Only Parts are allowed.'),
					indicator: 'red'
				});
				frappe.model.set_value(cdt, cdn, 'part_no', null);
				return;
			}

			// 2) Get Standard Selling Rate
			frappe.db.get_value('Item Price',
				{ item_code: row.part_no, price_list: 'Standard Selling' },
				'price_list_rate'
			).then(prices => {
				let standard_rate = prices.message.price_list_rate;

				// 3) Get Warranty GP%
				let custom_gp = item_doc.custom_warranty_gp || 0;
				console.log(custom_gp);


				// if (custom_gp === 0) {
				//     frappe.msgprint({
				//         title: __('Warning'),
				//         message: __('Warranty GP% is not set for this item. Price will be calculated without GP markup.'),
				//         indicator: 'orange'
				//     });
				// }

				// 4) Calculate price
				let price = standard_rate * (custom_gp / 100);

				frappe.model.set_value(cdt, cdn, 'price', price).then(() => {
					// Calculate line amount
					let qty = row.qty || 1;
					frappe.model.set_value(cdt, cdn, 'amount', price * qty);
					frm.refresh_field('part_items');
					calculate_part_sub_total(frm, "total_excl", "part_items");
				});
			});
		});
		frappe.call({
			method: "edp_online_vehicles.events.odo.check_duplicate_part",
			args: {
				vin: frm.doc.vin_serial_no,
				part_no: row.part_no,
				current_claim: frm.doc.name
			},
			callback(r) {
				if (r.message && r.message.is_duplicate) {
					let claim_numbers = r.message.claims || [];
					let system_note = "Duplicate Parts Found";
					
					if (claim_numbers.length > 0) {
						system_note += ": " + claim_numbers.join(", ");
					}

					frappe.model.set_value(
						row.doctype,
						row.name,
						"system_note",
						system_note
					);

					set_row_color(frm, row, "#ffcc99");
				}
			}
		});

		apply_row_color(frm, row);

		// Validate row coloring & system note
		validate_part_item(frm, row);
	},

	price(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, 'amount', (row.price || 0) * (row.qty || 1));
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},

	qty(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, 'amount', (row.price || 0) * (row.qty || 1));
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},

	part_items_add(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		set_row_color(frm, row, ""); // default color
		setTimeout(() => reapply_colors(frm), 100);
	},

	part_items_remove(frm, cdt, cdn) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
		setTimeout(() => reapply_colors(frm), 100);
	},
});

// -------------------------------------------------
// Extra Items
// -------------------------------------------------
frappe.ui.form.on("Extra Items", {
	price_per_item_excl(frm, cdt, cdn) { calculate_extra_total(frm, cdt, cdn); },
	qty(frm, cdt, cdn) { calculate_extra_total(frm, cdt, cdn); },
	extra_items_remove(frm) { calculate_sub_total(frm, "extra_cost_total_excl", "extra_items"); },
	total_excl(frm) { calculate_sub_total(frm, "extra_cost_total_excl", "extra_items"); },
});

// -------------------------------------------------
// Calculate total for parts
// -------------------------------------------------
const calculate_part_sub_total = (frm, field_name, table_name) => {
	let total = 0;
	frm.doc[table_name].forEach(row => total += (row.price || 0) * (row.qty || 0));
	frm.set_value(field_name, total);
	frm.refresh_field(field_name);
};

// -------------------------------------------------
// Calculate total for extra items
// -------------------------------------------------
const calculate_extra_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.price_per_item_excl || 0) * (row.qty || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
	calculate_sub_total(frm, "extra_cost_total_excl", "extra_items");
};

const calculate_sub_total = (frm, field_name, table_name) => {
	let total = 0;
	frm.doc[table_name].forEach(row => total += row.total_excl || 0);
	frm.set_value(field_name, total);
	frm.refresh_field(field_name);
};

// -------------------------------------------------
// Row color helpers
// -------------------------------------------------
function set_row_color(frm, row, color) {
	console.log("Color");

	if (frm.fields_dict['part_items'] && frm.fields_dict['part_items'].grid) {
		let grid = frm.fields_dict['part_items'].grid;
		let grid_row = grid.grid_rows.find(r => r.doc.name === row.name);
		if (grid_row) $(grid_row.wrapper).css('background-color', color);
	} else {
		setTimeout(() => set_row_color(frm, row, color), 50);
	}
}

function reapply_colors(frm) {
	if (!frm.doc.vin_serial_no) return;

	frappe.call({
		method: "edp_online_vehicles.events.odo.check_clor",
		args: { vin: frm.doc.vin_serial_no },
		callback(r) {
			let allowed_items = r.message || [];
			let grid = frm.fields_dict['part_items'].grid;
			if (!grid) return;

			grid.grid_rows.forEach(gr => {
				let color = "";

			if (gr.doc.system_note && gr.doc.system_note.startsWith("Duplicate Parts Found")) {
				color = "#ffcc99";
			}

				else if (gr.doc.part_no && !allowed_items.includes(gr.doc.part_no)) {
					color = "#ffdddd";
				}

				set_row_color(frm, gr.doc, color);
			});
		}
	});
}

function validate_part_item(frm, row) {
	if (!frm.doc.vin_serial_no || !row.part_no) return;

	frappe.call({
		method: "edp_online_vehicles.events.odo.check_clor",
		args: { vin: frm.doc.vin_serial_no },
		callback(r) {
			let allowed_items = r.message || [];

			if (row.system_note && row.system_note.startsWith("Duplicate Parts Found")) {
				set_row_color(frm, row, "#ffcc99");
				return;
			}

			if (!allowed_items.includes(row.part_no)) {
				set_row_color(frm, row, "#ffdddd");
				frappe.model.set_value(
					row.doctype,
					row.name,
					"system_note",
					"Part Not Covered"
				);
			} 
			else {
				set_row_color(frm, row, "");
				frappe.model.set_value(row.doctype, row.name, "system_note", "");
			}
		}
	});
}



function set_row_color(frm, row, color) {
	if (frm.fields_dict['part_items'] && frm.fields_dict['part_items'].grid) {
		let grid = frm.fields_dict['part_items'].grid;
		let grid_row = grid.grid_rows.find(r => r.doc.name === row.name);
		if (grid_row) $(grid_row.wrapper).css('background-color', color);
	} else {
		setTimeout(() => set_row_color(frm, row, color), 50);
	}
}



