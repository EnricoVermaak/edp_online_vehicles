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
	vin_serial_no(frm, dt, dn) {
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
	},
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

frappe.ui.form.on("Warranty Part Item", {
	price(frm, cdt, cdn) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},
	qty(frm, cdt, cdn) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},
	part_items_remove(frm) {
		calculate_part_sub_total(frm, "total_excl", "part_items");
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
