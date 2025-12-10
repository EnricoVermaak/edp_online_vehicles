// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

/* global ZXing */

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
		frm.doc.part_items.forEach(function (row) {
			check_part_no_and_color(frm, row);
		});
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
	vin_serial_no: function (frm) {

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

		// Get linked Vehicle Stock record
		frappe.db.get_doc("Vehicle Stock", frm.doc.vin_serial_no)
			.then(stock_doc => {

				let rows = stock_doc.table_pcgj || [];
				if (rows.length === 0) {
					return;
				}
				// Extract all warranty_odo_limit values from child table
				let limits = rows.map(r => r.warranty_odo_limit);

				// Find max value
				let max_limit = Math.max(...limits);

				let current_odo = frm.doc.odo_reading;

				if (!current_odo) {
					frappe.msgprint("Please enter ODO Reading first.");
					return;
				}

				// Compare current odo with max limit
				if (current_odo > max_limit) {
					frappe.msgprint("Odometer reading is outside the warranty limit!");
				}
			});


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
	},
	after_save(frm) {
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


		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_warranty_date",
				args: {
					vin: frm.doc.vin_serial_no,
				},
				callback(r) {
					if (!r.message) return;

					if (!r.message.is_valid) {
						frappe.msgprint(
							"Please note the selected vehicle falls outside the allocated warranty period parameters. Please contact Head Office for more information");
					}
				},
			});
		}
	},
});
frappe.ui.form.on('Warranty Part Item', {
	part_no: function (frm, cdt, cdn) {

		let row = locals[cdt][cdn];
		if (!row.part_no) return;

		// 1) Get Standard Selling Price
		frappe.db.get_list('Item Price', {
			filters: {
				item_code: row.part_no,       // FIXED
				price_list: 'Standard Selling'
			},
			limit: 1,
			fields: ['price_list_rate']
		}).then(prices => {

			let standard_rate = prices.length ? prices[0].price_list_rate : 0;

			// 2) Get Item Doc for custom GP
			frappe.db.get_doc('Item', row.part_no).then(item_doc => {

				let custom_gp = item_doc.custom_warranty_gp || 0;
				let gp_percentage = custom_gp / 100;
				// If custom_gp is percentage:
				let price = standard_rate + (standard_rate * gp_percentage);

				// Set price in child table
				frappe.model.set_value(cdt, cdn, 'price', price);

				frm.refresh_field('part_items');
			});
		});

		check_part_no_and_color(frm, row);


	},
	price(frm, cdt, cdn) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},
	qty(frm, cdt, cdn) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},
	part_items_remove(frm) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
	}
});

frappe.ui.form.on("Extra Items", {
	price_per_item_excl(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},
	qty(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},
	extra_items_remove(frm) {
		calculate_sub_total(frm, "extra_cost_total_excl", "extra_items");
	},

	total_excl(frm) {
		calculate_sub_total(frm, "extra_cost_total_excl", "extra_items");
	},
});

const calculate_extra_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.price_per_item_excl || !row.qty) return;
	let total = row.price_per_item_excl * row.qty;
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

const calculate_part_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.qty * row.price;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

function set_row_color(frm, row, color) {
	if (frm.fields_dict['part_items'] && frm.fields_dict['part_items'].grid) {
		let grid = frm.fields_dict['part_items'].grid;

		// Find the exact row by matching doc.name
		let grid_row = grid.grid_rows.find(r => r.doc.name === row.name);
		if (grid_row) {
			$(grid_row.wrapper).css('background-color', color);
		}
	} else {
		setTimeout(() => set_row_color(frm, row, color), 50);
	}
}
function check_part_no_and_color(frm, row) {
	if (!row.part_no) return;

	frappe.db.get_list('Vehicles Warranty Plan Administration', { fields: ['name'], limit: 0 })
		.then(plans => {
			let promises = plans.map(p =>
				frappe.db.get_doc('Vehicles Warranty Plan Administration', p.name)
					.then(doc => doc.items || [])
			);

			Promise.all(promises).then(all_items_arrays => {
				let all_items = all_items_arrays.flatMap(arr => arr.map(i => i.item));
				set_row_color(frm, row, all_items.includes(row.part_no) ? '' : '#E8A2A2');
			});
		});
}

// Set row color (same as before)
function set_row_color(frm, row, color) {
	if (frm.fields_dict['part_items'] && frm.fields_dict['part_items'].grid) {
		let grid = frm.fields_dict['part_items'].grid;
		let grid_row = grid.grid_rows.find(r => r.doc.name === row.name);
		if (grid_row) $(grid_row.wrapper).css('background-color', color);
	} else {
		setTimeout(() => set_row_color(frm, row, color), 50);
	}
}
