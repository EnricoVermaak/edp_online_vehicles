// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

/* global ZXing */

let codeReader;
let previous_status_value = null;
let odo_message_shown = false;
let odo_limit_message_shown = false;


// Preload ZXing library and initialize the reader on page load
$(document).ready(function () {
	frappe.require(
		"https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js",
		function () {
			codeReader = new ZXing.BrowserMultiFormatReader();
			console.log("ZXing library loaded");
		},
	);
});

frappe.ui.form.on("Vehicles Service", {
	service_type(frm) {
		// CRITICAL: Mark that user manually selected service_type
		if (frm.doc.service_type) {
			frm._user_set_service_type = true;
			frm._preserved_service_type = frm.doc.service_type;
			frm._service_type_selected_time = Date.now();
		}
		
		console.log(frm.doc.dealer);


		if (!frm.doc.service_type) {
			frm.set_value("service_parts_items", []);
			frm.set_value("service_labour_items", []);
			return;
		}

		frm.set_value("service_parts_items", []);
		frm.set_value("service_labour_items", []);

		// Pehle service schedule ka doc fetch karo
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Service Schedules",
				name: frm.doc.service_type
			},
			callback: function (r) {
				console.log(r);
				console.log("hello");


				if (!r.message) return;

				let doc = r.message;

				let parts_items = [];
				let labour_items = [];

				(doc.service_parts_items || []).forEach(row => {
					parts_items.push({
						item: row.item,
						description: row.description,
						qty: row.qty,
						price_excl: row.price_excl,
						total_excl: row.total_excl
					});
				});


				frappe.db.get_doc('Company', frm.doc.dealer).then(company => {

					let custom_rate = company.custom_service_labour_rate || 0;
					console.log(custom_rate);


					(doc.service_labour_items || []).forEach(row => {
						labour_items.push({
							item: row.item,
							description: row.description,
							duration_hours: row.duration_hours,
							rate_hour: custom_rate,
							total_excl: (row.duration_hours || 0) * custom_rate
						});
					});

					frm.set_value("service_parts_items", parts_items);
					frm.set_value("service_labour_items", labour_items);
				});

			}
		});
		if (
			frm.doc.service_type &&
			(frm.doc.service_type.includes("Major") ||
				frm.doc.service_type.includes("Minor"))
		) {
			return;
		} else {
			if (frm.doc.service_type) {
				frm.doc.service_parts_items = [];
				frm.doc.service_labour_items = [];
				frappe.db
					.get_doc("Service Schedules", frm.doc.service_type)
					.then((doc) => {
						for (let part of doc.service_parts_items) {
							let row = frm.add_child("service_parts_items");
							let data = {
								item: part.item,
								description: part.description,
								qty: part.qty,
							};

							for (const key in data) {
								frappe.model.set_value(
									row.doctype,
									row.name,
									key,
									data[key],
								);
							}

							frm.refresh_field("service_parts_items");
						}

						for (let labour of doc.service_labour_items) {
							let row = frm.add_child("service_labour_items");

							let data = {
								item: labour.item,
								description: labour.description,
								rate_hour: labour.rate_hour,
								duration_hours: labour.duration_hours,
								total_excl: labour.total_excl,
							};

							for (const key in data) {
								frappe.model.set_value(
									row.doctype,
									row.name,
									key,
									data[key],
								);
							}

							frm.refresh_field("service_labour_items");
						}
						const setEditValues = (parts, labour) => {
							frm.set_value("edit_parts", parts);
							frm.set_value("edit_labour", labour);
						};

						let service_type = frm.doc.service_type.slice(-5);
						const isOtherService = service_type === "Other";

						if (isOtherService) {
							setEditValues(1, 1);
						} else {
							frappe.db
								.get_single_value(
									"Vehicle Service Settings",
									"allow_additional_parts_any_service",
								)
								.then((allowAdditionalParts) => {
									setEditValues(
										allowAdditionalParts,
										allowAdditionalParts,
									);
								})
								.catch(console.error);
						}
					});
			}
		}
	},

	// dealer: function (frm) {
	// 	if (!frm.doc.dealer) {
	// 		return;
	// 	}

	// 	// Fetch values from Vehicles doctype
	// 	frappe.db.get_doc('Company', frm.doc.dealer)
	// 		.then(vehicle => {
	// 			console.log(vehicle);


	// 			// 1) Reset both child tables
	// 			frm.clear_table('service_labour_items');
	// 			frm.clear_table('service_parts_items');

	// 			// ----------------------------
	// 			//  CHILD TABLE 1
	// 			// ----------------------------
	// 			let labour_row = frm.add_child('service_labour_items');
	// 			labour_row.rate_hour = vehicle.custom_service_labour_rate || 0;

	// 			// ----------------------------
	// 			//  CHILD TABLE 2
	// 			// ----------------------------
	// 			let parts_row = frm.add_child('service_parts_items');
	// 			parts_row.price_excl = vehicle.custom_warranty_labour_rate || 0;

	// 			frm.refresh_fields();
	// 		});
	// },
	onload(frm) {
		if (frm.doc.vehicles_incidents) {
			frappe.db
				.get_doc("Vehicles Incidents", frm.doc.vehicles_incidents)
				.then((doc) => {
					for (let row of doc.parts) {
						frm.add_child("service_parts_items", {
							item: row.item || "",
							description: row.description || "",
							price_excl: row.price_excl || 0,
							qty: row.qty || 0,
							total_excl: row.total_excl || 0,
							uom: row.uom || "",
						});
						frm.refresh_field("service_parts_items");

						frm.set_value("parts_total_excl", doc.parts_total);
					}
				});
		}

		// Reset the field to its previous service_status if no new value is selected
		$(document).on(
			"blur",
			'[data-fieldname="service_status"]',
			function () {
				// Check if the value is empty (or remains unchanged)
				if (!frm.doc.service_status || frm.doc.service_status === "") {
					frm.set_value("service_status", previous_status_value);
				}
			},
		);

		// $(document).on('click', '[data-fieldname="service_status"]', function() {
		//   frm.set_value('service_status', '');
		// });

		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");

			frappe.db
				.get_list("Service Status", {
					filters: {
						is_default_status: 1,
					},
					fields: ["name"],
				})
				.then((serv_status) => {
					if (serv_status.length > 0) {
						frm.set_value("service_status", serv_status[0].name);
					}
				});
		}

		frm.set_query("item", "service_labour_items", () => {
			return {
				filters: {
					item_group: "Service Labour",
				},
			};
		});
		frm.set_query("item", "service_parts_items", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});
		frm.set_query("service_type", () => {
			return {
				query: "edp_online_vehicles.events.service_type.service_type_query",
				filters: {
					model_code: frm.doc.model,
					vin_serial_no: frm.doc.vin_serial_no,  // correct key
				},
			};
		});

		frm.set_query("inspection_template", () => {
			return {
				filters: {
					type: "Service Inspection",
				},
			};
		});
		frm.set_query("vehicles_inspection_template", () => {
			return {
				filters: {
					type: "Standard Service Checklist",
				},
			};
		});
		previous_status_value = frm.doc.service_status;
	},

	refresh(frm, dt, dn) {
		if (!frm.doc.job_card_no) {
			if (!frm.doc.job_card_no) {
				frappe.db
					.get_doc("Vehicle Service Settings")
					.then((setting_doc) => {
						if (setting_doc.allow_auto_job_card_no) {
							var lastJobNo = setting_doc.last_auto_job_card_no;

							const prefix = setting_doc.auto_job_card_no_prefix;
							const number = lastJobNo.match(/\d+/)[0];

							const incrementedNumber = (parseInt(number, 10) + 1)
								.toString()
								.padStart(6, "0");

							const nextJobNo = prefix + incrementedNumber;
							console.log(nextJobNo);

							frm.set_value("job_card_no", nextJobNo);
						}
					});
			}
		}

		let debounceTimeout;
		$(document).on(
			"blur",
			'[data-fieldname="odo_reading_hours"]',
			function () {
				clearTimeout(debounceTimeout);
				debounceTimeout = setTimeout(() => {

					if (!frm.doc.service_type) {

						frm.set_value("odo_reading_hours", 0);

						if (!odo_limit_message_shown) {
							odo_limit_message_shown = true;
							frappe.msgprint("Please select a service type before setting the Odo Reading");
						}

						return;
					}

					if (frm.doc.odo_reading_hours > 0) {

						frappe.db
							.get_value("Service Schedules", frm.doc.service_type, "interval")
							.then((r) => {
								let interval = r.message.interval;

								frappe.db
									.get_value("Model Administration", frm.doc.model, [
										"service_type_max_allowance",
										"service_type_minimum_allowance",
									])
									.then((r) => {
										let max_allowance = r.message.service_type_max_allowance;
										let min_allowance = r.message.service_type_minimum_allowance;

										let min_odo_value = parseInt(interval) - parseInt(min_allowance);
										let max_odo_value = parseInt(interval) + parseInt(max_allowance);

										// 🚨 Show message ONLY ONE TIME
										if (frm.doc.odo_reading_hours < min_odo_value) {

											if (!odo_limit_message_shown) {
												odo_limit_message_shown = true;

												frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
													.then((r) => {
														let model = r.message.model
														frappe.model.set_value(dt, dn, "service_type", `SS-${model}-Other`);
													})
												frappe.msgprint(
													"Your vehicle hasn't reached its service threshold yet. Please check back when it meets the minimum mileage requirement."
												);
											}

										} else if (frm.doc.odo_reading_hours > max_odo_value) {

											if (!odo_limit_message_shown) {
												odo_limit_message_shown = true;
												frappe.msgprint(
													"Your vehicle's mileage has exceeded the current service range. Please select the upcoming service schedule."
												);
											}
										}
									});
							});
					}

				}, 20);
			}
		);


		frm.add_custom_button(
			__("Request for Service"),
			() => {
				new frappe.ui.form.MultiSelectDialog({
					doctype: "Request for Service",
					target: frm,
					add_filters_group: 1,
					date_field: "posting_date",
					setters: {
						//   customer: frm.doc.customer,
						//   custom_delivery_trip_assign: "No",
					},
					get_query_filters: {
						customer: frm.doc.customer,
					},
					action(selections) {
						if (selections && selections.length > 0) {
							frm.doc.service_parts_items = [];
							frm.doc.service_labour_items = [];
							for (let row of selections) {
								frappe.db
									.get_doc("Request for Service", row)
									.then((doc) => {
										for (let part of doc.parts) {
											let row = frm.add_child(
												"service_parts_items",
											);

											let data = {
												item: part.item,
												description: part.description,
												qty: part.qty,
											};

											for (const key in data) {
												frappe.model.set_value(
													row.doctype,
													row.name,
													key,
													data[key],
												);
											}

											frm.refresh_field(
												"service_parts_items",
											);
										}

										for (let labour of doc.labour) {
											let row = frm.add_child(
												"service_labour_items",
											);

											let data = {
												item: labour.item,
												description:
													labour.labour_description,
												rate_hour: labour.rate_hour,
												duration_hours:
													labour.duration_hours,
												total_excl: labour.total_excl,
											};

											for (const key in data) {
												frappe.model.set_value(
													row.doctype,
													row.name,
													key,
													data[key],
												);
											}

											frm.refresh_field(
												"service_labour_items",
											);
										}
									});
							}
						}
						cur_dialog.hide();
					},
				});
			},
			__("Get Items"),
		);

		if (!frm.is_new()) {
			frm.add_custom_button(
				"Request For Service",
				() => {
					if (
						!frm.doc.service_parts_items.length > 0 &&
						!frm.doc.service_labour_items.length > 0
					) {
						frappe.throw(
							"No parts added to the parts table, please add parts to perform this action",
						);
					} else {
						frappe.call({
							method: "edp_online_vehicles.events.rfs_child_add.rfs_fun",
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

			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Vehicle Service Settings",
				},
				callback: function (r) {
					if (r.message) {
						var settings = r.message;

						// Check if the checkboxes are checked
						if (
							settings.allow_user_to_create_sales_order_from_vehicles_service
						) {
							frm.add_custom_button(
								"Sales Order",
								() => {
									if (
										!frm.doc.service_parts_items.length > 0
									) {
										frappe.throw(
											"No parts added to the parts table, please add parts to perform this action",
										);
									} else if (!frm.doc.part_schedule_date) {
										frappe.throw(
											"Please select a Scheduled Delivery Date under Parts Table",
										);
									} else {
										frappe.call({
											method: "edp_online_vehicles.events.create_sales_order.create_sales_order_service",
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
						}

						if (
							settings.allow_user_to_create_material_request_from_vehicles_service
						) {
							frm.add_custom_button(
								"Material Request",
								() => {
									if (
										!frm.doc.service_parts_items.length >
										0 &&
										!frm.doc.service_labour_items.length > 0
									) {
										frappe.throw(
											"No parts added to the parts table, please add parts to perform this action",
										);
									} else if (!frm.doc.part_schedule_date) {
										frappe.throw(
											"Please select a Scheduled Delivery Date under Parts Table",
										);
									} else {
										frappe.call({
											method: "edp_online_vehicles.events.create_material_request.create_material_request_service",
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
						}
					}
				},
			});

			frm.add_custom_button(
				"Internal Docs and Notes",
				() => {
					frappe.model.open_mapped_doc({
						method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_service.vehicles_service.create_internal_docs_notes",
						frm: frm,
					});
				},
				"Create",
			);
		}

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
									frm.set_value("licence_no", license_no);
									frm.set_value(
										"licence_expiry_date",
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

	after_save(frm) {
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.service_status_change",
			args: {
				vinno: frm.doc.vin_serial_no,
				status: frm.doc.service_status,
			},
			callback: function (r) {
				if (r.message) {
					frappe.show_alert(
						{
							message: r.message,
						},
						5,
					);

					frappe.db
						.get_list("Service Status", {
							filters: {
								automatically_submit_document: 1,
							},
							fields: ["name"],
						})
						.then((statuses) => {
							console.log(statuses);

							if (statuses.length > 0) {
								console.log(frm.doc.name);

								let status = statuses.map((s) => s.name);

								if (status == frm.doc.service_status) {
									frappe.call({
										method: "edp_online_vehicles.events.submit_document.submit_service_document",
										args: {
											doc: frm.doc.name,
										},
										callback: function (r) {
											if (r.message) {
												console.log(
													"Before refresh:",
													frm.doc.docstatus,
												);

												frm.reload_doc().then(() => {
													console.log(
														"After refresh:",
														frm.doc.docstatus,
													);

													frappe.show_alert(
														{
															message: r.message,
														},
														5,
													);
												});
											}
										},
									});
								}
							}
						});
				}
			},
		});
	},
	vin_serial_no(frm, dt, dn) {
		// STEP 1: Preserve user-entered values BEFORE any operations
		let preserved_odo = frm.doc.odo_reading_hours || null;
		let preserved_service_type = frm.doc.service_type || null;
		
		// Try to get from input field if doc doesn't have it yet
		if (!preserved_odo && frm.fields_dict.odo_reading_hours && frm.fields_dict.odo_reading_hours.$input) {
			let input_val = frm.fields_dict.odo_reading_hours.$input.val();
			if (input_val && parseFloat(input_val) > 0) {
				preserved_odo = parseFloat(input_val);
			}
		}
		
		if (!preserved_service_type && frm.fields_dict.service_type && frm.fields_dict.service_type.$input) {
			let input_val = frm.fields_dict.service_type.$input.val();
			if (input_val) {
				preserved_service_type = input_val;
			}
		}
		
		// Use existing preserved value if user already set it
		if (frm._preserved_service_type && frm._user_set_service_type) {
			preserved_service_type = frm._preserved_service_type;
		}
		
		// Store at form level for async callbacks
		frm._preserved_odo = preserved_odo;
		frm._preserved_service_type = preserved_service_type;
		
		// Mark as user-set if it exists and is NOT "-Other" (which is auto-set by system)
		// Also check if it was recently selected (within last 3 seconds)
		let recently_selected = frm._service_type_selected_time && 
		                        (Date.now() - frm._service_type_selected_time) < 3000;
		
		if (preserved_service_type && !preserved_service_type.endsWith("-Other")) {
			frm._user_set_service_type = true;
		} else if (recently_selected && preserved_service_type) {
			frm._user_set_service_type = true;
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
							"This vehicles was reported as stolen. Please contact Head Office immediately for more information"
						);
					} else {
						let seven_days_ago = frappe.datetime.add_days(
							frappe.datetime.get_today(),
							-7
						);

						frappe.db
							.get_list("Vehicles Service", {
								filters: {
									vin_serial_no: frm.doc.vin_serial_no,
									creation: [">=", seven_days_ago],
								},
								fields: ["name"],
							})
							.then((existing_services) => {
								if (existing_services.length > 0) {
									frappe.msgprint(
										"Please be aware that a service request for this vehicle has been submitted within the last 7 days."
									);
								}
							});
					}
				});
		}

		// STEP 2: Only clear odo_reading_hours if user didn't enter a value
		if (!preserved_odo || preserved_odo === 0) {
			frm.set_value("odo_reading_hours", null);
		}

		// STEP 3: Run business logic checks (service date and warranty date)
		// These will auto-set service_type to "-Other" if dates are invalid
		// BUT they will respect user selections
		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_service_date",
				args: {
					vin: frm.doc.vin_serial_no,
				},
				callback(r) {
					if (!r.message) return;

					if (!r.message.is_valid) {
						// CRITICAL: Don't overwrite if user manually selected service_type
						// Check multiple conditions to be absolutely sure
						let user_selected = frm._user_set_service_type || 
						                   (frm._service_type_selected_time && 
						                    (Date.now() - frm._service_type_selected_time) < 3000) ||
						                   (frm.doc.service_type && !frm.doc.service_type.endsWith("-Other")) ||
						                   (frm._preserved_service_type && !frm._preserved_service_type.endsWith("-Other"));
						
						if (user_selected) {
							return; // Respect user selection
						}
						
						if (frm.doc.service_type && frm.doc.service_type.endsWith("-Other")) {
							return; // Already set to Other
						}
						frappe.msgprint(
							"Please note the selected vehicle falls outside the allocated service period parameters. Please contact Head Office for more information."
						);

						frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
							.then((res) => {
								let model = res.message.model;
								let service_value = `SS-${model}-Other`;

								console.log(service_value);

								// ⭐ Correct dt & dn
								let dt = frm.doctype;
								let dn = frm.doc.name;

								// ⭐ MOST RELIABLE (best practice)
								frappe.model.set_value(dt, dn, "service_type", service_value);

								frm.refresh_field("service_type");
							});
					}
				},
			});
		}

		//  **END DATE RANGE CHECK**
		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_warranty_date",
				args: {
					vin: frm.doc.vin_serial_no,
				},
				callback(r) {
					if (!r.message) return;

					if (!r.message.is_valid) {
						// CRITICAL: Don't overwrite if user manually selected service_type
						// Check multiple conditions to be absolutely sure
						let user_selected = frm._user_set_service_type || 
						                   (frm._service_type_selected_time && 
						                    (Date.now() - frm._service_type_selected_time) < 3000) ||
						                   (frm.doc.service_type && !frm.doc.service_type.endsWith("-Other")) ||
						                   (frm._preserved_service_type && !frm._preserved_service_type.endsWith("-Other"));
						
						if (user_selected) {
							return; // Respect user selection
						}

						// 👉 Ignore only if service_type ends with "-Other"
						if (frm.doc.service_type && frm.doc.service_type.endsWith("-Other")) {
							return; // Already set to Other
						}

						frappe.msgprint(
							"Please note the selected vehicle falls outside the allocated warranty period. Please contact Head Office for more information."
						);

						// Get model
						frappe.db
							.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
							.then((res) => {
								let model = res.message.model;
								let service_value = `SS-${model}-Other`;

								console.log("Setting:", service_value);

								// ⭐ dt & dn best practice
								let dt = frm.doctype;
								let dn = frm.doc.name;

								frappe.model.set_value(dt, dn, "service_type", service_value);

								frm.refresh_field("service_type");
							});
					}
				},
			});
		}

		// STEP 3: Restore preserved values after form refresh completes
		if (preserved_odo && preserved_odo > 0) {
			setTimeout(() => {
				if (frm.doc.vin_serial_no && (!frm.doc.odo_reading_hours || frm.doc.odo_reading_hours !== preserved_odo)) {
					frm.set_value("odo_reading_hours", preserved_odo);
				}
			}, 300);
		}
		
		// Restore service_type with multiple attempts to catch form refreshes
		if (preserved_service_type && frm._user_set_service_type) {
			let restore_attempts = [100, 300, 500, 1000];
			restore_attempts.forEach((delay) => {
				setTimeout(() => {
					if (frm.doc.vin_serial_no && (!frm.doc.service_type || frm.doc.service_type !== preserved_service_type)) {
						// Only restore if user hasn't selected a different one
						let current_input = frm.fields_dict.service_type && frm.fields_dict.service_type.$input ? 
						                   frm.fields_dict.service_type.$input.val() : null;
						if (!current_input || current_input === preserved_service_type) {
							frm.set_value("service_type", preserved_service_type);
							frm._user_set_service_type = true;
							frm._preserved_service_type = preserved_service_type;
						}
					}
				}, delay);
			});
		}

	},



	inspection_template(frm, dt, dn) {
		if (frm.doc.inspection_template) {
			frm.doc.inspection_items = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("inspection_items", {
							description: row.description,
						});
						frm.refresh_field("inspection_items");
					}
				});
		} else {
			frm.doc.inspection_items = [];
			frm.refresh_field("inspection_items");
		}
	},
	vehicles_inspection_template(frm, dt, dn) {
		if (frm.doc.vehicles_inspection_template) {
			frm.doc.standard_checklist = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.vehicles_inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("standard_checklist", {
							description: row.description,
						});
						frm.refresh_field("standard_checklist");
					}
				});
		} else {
			frm.doc.standard_checklist = [];
			frm.refresh_field("standard_checklist");
		}
	},
	odo_reading_hours(frm, dt, dn) {
		if (frm.doc.odo_reading_hours) {
			frappe.db
				.get_single_value(
					"Vehicle Service Settings",
					"allow_service_odo_reading_roll_back",
				)
				.then((allow_odo_rollback) => {
					if (!allow_odo_rollback) {
						// Improved check for falsy values
						if (frm.doc.vin_serial_no) {
							frappe.db
								.get_list("Vehicles Service", {
									filters: {
										vin_serial_no: frm.doc.vin_serial_no,
									},
									fields: ["odo_reading_hours"],
								})
								.then((records) => {
									let biggest_reading = 0;
									records.forEach((reading) => {
										if (
											reading.odo_reading_hours >
											biggest_reading
										) {
											biggest_reading =
												reading.odo_reading_hours;
										}
									});

									if (
										frm.doc.odo_reading_hours <
										biggest_reading
									) {
										frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
											.then((r) => {
												let model = r.message.model

												frappe.model.set_value(dt, dn, "service_type", `SS-${model}-Other`);
											});
										frm.set_value(
											"odo_reading_hours",
											null,
										);
										frappe.throw(
											"The entered odometer reading cannot be lower than the previous service reading of " +
											biggest_reading +
											".",
										);
									}
								});
						} else {
							frm.set_value("odo_reading_hours", null);
							frappe.throw(
								"Please enter the Vehicle VIN No/ Serial No",
							);
						}
					}
				});
		}
	},

	before_save: async function (frm) {
		const dt = frm.doctype;
		const dn = frm.doc.name;
		if (!frm.doc.job_card_no) {
			frappe.db
				.get_doc("Vehicle Service Settings")
				.then((setting_doc) => {
					if (setting_doc.allow_auto_job_card_no) {
						var lastJobNo = setting_doc.last_auto_job_card_no;

						const prefix = setting_doc.auto_job_card_no_prefix;
						const number = lastJobNo.match(/\d+/)[0];

						const incrementedNumber = (parseInt(number, 10) + 1)
							.toString()
							.padStart(6, "0");

						const nextJobNo = prefix + incrementedNumber;
						console.log(nextJobNo);

						frm.set_value("job_card_no", nextJobNo);
					}
				});
		}

		if (!frm.doc.service_type) {
			frm.set_value("odo_reading_hours", 0);

			if (!odo_message_shown) {
				odo_message_shown = true;
				frappe.msgprint("Please select a service type before setting the Odo Reading Ahmad saeed");
			}

			frappe.validated = false;
			return;
		}


		if (frm.doc.odo_reading_hours > 0) {
			// Await both async calls in sequence
			const serviceScheduleResponse = await frappe.db.get_value(
				"Service Schedules",
				frm.doc.service_type,
				"interval",
			);
			let interval = serviceScheduleResponse.message.interval;

			const modelAdminResponse = await frappe.db.get_value(
				"Model Administration",
				frm.doc.model,
				[
					"service_type_max_allowance",
					"service_type_minimum_allowance",
				],
			);

			let max_allowance =
				modelAdminResponse.message.service_type_max_allowance;
			let min_allowance =
				modelAdminResponse.message.service_type_minimum_allowance;

			// Convert values to numbers
			let min_odo_value = parseInt(interval) - parseInt(min_allowance);
			let max_odo_value = parseInt(interval) + parseInt(max_allowance);

			// Validate the odometer reading against the computed range
			if (frm.doc.odo_reading_hours < min_odo_value) {
				frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
					.then((r) => {
						let model = r.message.model

						frappe.model.set_value(dt, dn, "service_type", `SS-${model}-Other`);
					});

				frappe.msgprint(
					"Your vehicle hasn't reached its service threshold yet. Please check back when it meets the minimum mileage requirement.",
				);
				frappe.validated = false;
				return;
			}

			if (frm.doc.odo_reading_hours > max_odo_value) {
				frappe.msgprint(
					"Your vehicle's mileage has exceeded the current service range. Please select the upcoming service schedule to maintain optimal performance.",
				);
				frappe.validated = false;
				return;
			}
		}

		frappe.db
			.get_value(
				"Service Status",
				{ name: frm.doc.service_status },
				"technician_started_job",
			)
			.then((res) => {
				if (res.message.technician_started_job) {
					let now = frappe.datetime.now_datetime();
					frm.set_value("start_date", now);
				}
			});

		frappe.db
			.get_value(
				"Service Status",
				{ name: frm.doc.service_status },
				"technician_completed_job",
			)
			.then((res) => {
				if (res.message.technician_completed_job) {
					let now = frappe.datetime.now_datetime();
					frm.set_value("end_date", now);
				}
			});
	},
});
// -----------------------------------------------------
// SERVICE LABOUR ITEMS → AUTO RATE + TOTAL
// -----------------------------------------------------

frappe.ui.form.on('Service Labour Items', {
	item: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.item) return;

		// Company se custom rate lena
		frappe.db.get_doc('Company', frm.doc.dealer).then(res => {

			// Set rate for all rows
			frm.doc.service_labour_items.forEach(r => {
				r.rate_hour = res.custom_service_labour_rate;

				// Total = duration * rate
				r.total_excl = (r.duration_hours || 0) * (r.rate_hour || 0);
			});

			frm.refresh_field('service_labour_items');

			// Update main totals
			calculate_sub_total(frm, "labours_total_excl", "service_labour_items");
			calculate_labour_hours(frm, "duration_total", "service_labour_items");
		});
	}
});

// -----------------------------------------------------
// SERVICE PARTS ITEMS → AUTO PRICE
// -----------------------------------------------------

frappe.ui.form.on('Service Parts Items', {
	// item: function (frm, cdt, cdn) {
	// 	let row = locals[cdt][cdn];
	// 	if (!row.item) return;

	// 	// get standard price
	// 	frappe.db.get_list('Item Price', {
	// 		filters: { item_code: row.item, price_list: 'Standard Selling' },
	// 		limit: 1,
	// 		fields: ['price_list_rate']
	// 	}).then(prices => {

	// 		let standard_rate = prices.length ? prices[0].price_list_rate : 0;

	// 		frappe.db.get_doc('Item', row.item).then(item_doc => {
	// 			let custom_gp = item_doc.custom_service_gp || 0;
	// 			let price = standard_rate * custom_gp;

	// 			frappe.model.set_value(cdt, cdn, 'price_excl', price);

	// 			frm.refresh_field('service_parts_items');

	// 			calculate_sub_total(frm, "parts_total_excl", "service_parts_items");
	// 		});
	// 	});
	// }
});

// -----------------------------------------------------
// UNIVERSAL EVENTS – PARTS
// -----------------------------------------------------

frappe.ui.form.on("Service Parts Items", {

	item(frm, cdt, cdn) {
		if (frm.doc.price_list) get_price(frm, cdt, cdn);
	},

	service_parts_items_remove(frm) {
		calculate_sub_total(frm, "parts_total_excl", "service_parts_items");
	},

	price_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	total_excl(frm, cdt, cdn) {
		calculate_sub_total(frm, "parts_total_excl", "service_parts_items");
	},
});

// -----------------------------------------------------
// UNIVERSAL EVENTS – LABOUR
// -----------------------------------------------------

frappe.ui.form.on("Service Labour Items", {

	item(frm, cdt, cdn) {
		if (frm.doc.price_list) get_price(frm, cdt, cdn);
	},

	service_labour_items_remove(frm) {
		calculate_sub_total(frm, "labours_total_excl", "service_labour_items");
		calculate_labour_hours(frm, "duration_total", "service_labour_items");
	},

	rate_hour(frm, cdt, cdn) {
		calculate_labour_total(frm, cdt, cdn);
	},

	duration_hours(frm, cdt, cdn) {
		calculate_labour_total(frm, cdt, cdn);
		calculate_labour_hours(frm, "duration_total", "service_labour_items");
	},

	total_excl(frm, cdt, cdn) {
		calculate_sub_total(frm, "labours_total_excl", "service_labour_items");
	},
});

// -----------------------------------------------------
// UNIVERSAL EVENTS – EXTRA ITEMS
// -----------------------------------------------------

frappe.ui.form.on("Extra Items", {

	price_per_item_excl(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},

	extras_remove(frm) {
		calculate_sub_total(frm, "extra_cost_total_excl", "transaction_list");
	},

	total_excl(frm, cdt, cdn) {
		calculate_sub_total(frm, "extra_cost_total_excl", "transaction_list");
	},
});

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

const get_price = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	if (!row.item) return;

	frappe.call({
		method: "edp_online_vehicles.events.price_list.get_price",
		args: {
			price_list: frm.doc.price_list,
			item: row.item,
		},
		callback: (r) => {
			let price = r.message;

			if (cdt == "Service Parts Items") {
				frappe.model.set_value(cdt, cdn, "price_excl", price);
			}
			if (cdt == "Service Labour Items") {
				frappe.model.set_value(cdt, cdn, "rate_hour", price);
			}
		},
	});
};

// PARTS TOTAL
const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.price_excl || 0) * (row.qty || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// LABOUR TOTAL
const calculate_labour_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.rate_hour || 0) * (row.duration_hours || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// EXTRA TOTAL
const calculate_extra_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.price_per_item_excl || 0) * (row.qty || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// SUB TOTAL
const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;

	for (const row of frm.doc[table_name] || []) {
		sub_total += row.total_excl || 0;
	}

	frappe.model.set_value(frm.doc.doctype, frm.doc.name, field_name, sub_total);
};

// LABOUR HOURS
const calculate_labour_hours = (frm, field_name, table_name) => {
	let hours_total = 0;

	for (const row of frm.doc[table_name] || []) {
		hours_total += row.duration_hours || 0;
	}

	frappe.model.set_value(frm.doc.doctype, frm.doc.name, field_name, hours_total);
};

// STOCK NUMBER INCREMENT
function incrementStockNumber(stockNumber) {
	const prefix = stockNumber.match(/[A-Za-z]+/)[0];
	const number = stockNumber.match(/\d+/)[0];

	const incrementedNumber = (parseInt(number, 10) + 1)
		.toString()
		.padStart(6, "0");

	return prefix + incrementedNumber;
}




//     refresh: function(frm) {
//         frm.page.set_title_sub("");

//         if (frm.doc.service_status) {
//             const color = {
//                 "Pending": "orange",
//                 "In Progress": "blue",
//                 "In Service": "purple",
//                 "Completed": "green",
//                 "Rejected": "red",
//                 "Cancelled": "darkgrey"
//             }[frm.doc.service_status] || "gray";

//             setTimeout(() => {
//                 $(".title-text").nextAll(".indicator-pill").remove(); // purana hata do
//                 $(".title-text").after(
//                     `<span class="indicator-pill ${color}" style="margin-left:10px; font-size:13px;">${frm.doc.service_status}</span>`
//                 );
//             }, 100);
//         }
//     },

//     service_status: function(frm) {
//         frm.trigger('refresh');
//     }
// });