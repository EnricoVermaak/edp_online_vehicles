// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt


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
		},
	);
});




frappe.ui.form.on("Vehicles Service", {
	service_status: function (frm) {

		if (!frm.doc.service_status) {
			frm.refresh_field('attach_documents');
			return;
		}

		frappe.db.get_doc('Service Status', frm.doc.service_status).then(status_doc => {
			let mandatory_names = [];

			if (status_doc.documents) {
				status_doc.documents.forEach(doc => {
					if (doc.mandatory === 'Yes') {

						let exists = frm.doc.attach_documents.some(
							row => row.document_name === doc.document_name
						);

						if (!exists) {
							let row = frm.add_child('attach_documents');
							row.document_name = doc.document_name;
							mandatory_names.push(doc.document_name);
						}
					}
				});
			}

			frm.refresh_field('attach_documents');
			frm.doc.__mandatory_names = mandatory_names;
		});
	},




	service_type(frm) {
		// Fetch the selected Service Schedule document
		frappe.db.get_doc('Service Schedules', frm.doc.service_type)
			.then(schedule => {

				let labour = schedule.allow_users_to_add_edit_remove_labour; // check field
				let part = schedule.allow_users_to_add_edit_remove_parts;  // check field

				// ===== LABOUR =====
				if (labour == 1) {
					frm.set_df_property("service_labour_items", "read_only", 0);
					frm.set_value("edit_labour", 1);
				} else {
					frm.set_df_property("service_labour_items", "read_only", 1);
					frm.set_value("edit_labour", 0);
				}

				// ===== PARTS =====
				if (part == 1) {
					frm.set_df_property("service_parts_items", "read_only", 0);
					frm.set_value("edit_parts", 1);
				} else {
					frm.set_df_property("service_parts_items", "read_only", 1);
					frm.set_value("edit_parts", 0);
				}

				frm.refresh_field("service_labour_items");
				frm.refresh_field("service_parts_items");
			});


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
				// console.log(r);
				// console.log("hello");


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

						// Use Service Schedule dynamic settings (same as first block)
						let schedule_allow_parts = doc.allow_users_to_add_edit_remove_parts || 0;
						let schedule_allow_labour = doc.allow_users_to_add_edit_remove_labour || 0;

						setEditValues(
							schedule_allow_parts ? 1 : 0,
							schedule_allow_labour ? 1 : 0
						);
					});
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
		odo_limit_message_shown = false;
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
		frm.add_custom_button(__('Inspection'), function () {
			frappe.route_options = {
				vin_serial_no: frm.doc.vin_serial_no,
				odo_reading: frm.doc.odo_reading_hours,
				customer: frm.doc.customer,
				customer_address: frm.doc.customer_address,
				technician: frm.doc.technician
			};

			frappe.set_route(
				"Form",
				"Vehicles Service Inspection",
				"new-vehicles-service-inspection"
			);
		}, __('Create'));


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

		// frm.add_custom_button(
		// 	__("Request for Service"),
		// 	() => {
		// 		new frappe.ui.form.MultiSelectDialog({
		// 			doctype: "Request for Service",
		// 			target: frm,
		// 			add_filters_group: 1,
		// 			date_field: "posting_date",
		// 			setters: {
		// 				//   customer: frm.doc.customer,
		// 				//   custom_delivery_trip_assign: "No",
		// 			},
		// 			get_query_filters: {
		// 				customer: frm.doc.customer,
		// 			},
		// 			action(selections) {
		// 				if (selections && selections.length > 0) {
		// 					frm.doc.service_parts_items = [];
		// 					frm.doc.service_labour_items = [];
		// 					for (let row of selections) {
		// 						frappe.db
		// 							.get_doc("Request for Service", row)
		// 							.then((doc) => {
		// 								for (let part of doc.parts) {
		// 									let row = frm.add_child(
		// 										"service_parts_items",
		// 									);
		// 
		// 									let data = {
		// 										item: part.item,
		// 										description: part.description,
		// 										qty: part.qty,
		// 									};
		// 
		// 									for (const key in data) {
		// 										frappe.model.set_value(
		// 											row.doctype,
		// 											row.name,
		// 											key,
		// 											data[key],
		// 										);
		// 									}
		// 
		// 									frm.refresh_field(
		// 										"service_parts_items",
		// 									);
		// 								}
		// 
		// 								for (let labour of doc.labour) {
		// 									let row = frm.add_child(
		// 										"service_labour_items",
		// 									);
		// 
		// 									let data = {
		// 										item: labour.item,
		// 										description:
		// 											labour.labour_description,
		// 										rate_hour: labour.rate_hour,
		// 										duration_hours:
		// 											labour.duration_hours,
		// 										total_excl: labour.total_excl,
		// 									};
		// 
		// 									for (const key in data) {
		// 										frappe.model.set_value(
		// 											row.doctype,
		// 											row.name,
		// 											key,
		// 											data[key],
		// 										);
		// 									}
		// 
		// 									frm.refresh_field(
		// 										"service_labour_items",
		// 									);
		// 								}
		// 							});
		// 					}
		// 				}
		// 				cur_dialog.hide();
		// 			},
		// 		});
		// 	},
		// 	__("Get Items"),
		// );

		if (!frm.is_new()) {
			// frm.add_custom_button(
			// 	"Request For Service",
			// 	() => {
			// 		if (
			// 			!frm.doc.service_parts_items.length > 0 &&
			// 			!frm.doc.service_labour_items.length > 0
			// 		) {
			// 			frappe.throw(
			// 				"No parts added to the parts table, please add parts to perform this action",
			// 			);
			// 		} else {
			// 			frappe.call({
			// 				method: "edp_online_vehicles.events.rfs_child_add.rfs_fun",
			// 				args: {
			// 					docname: frm.doc.name,
			// 				},
			// 				callback: function (r) {
			// 					if (r.message) {
			// 						frappe.msgprint(r.message);
			// 					}
			// 				},
			// 			});
			// 		}
			// 	},
			// 	"Create",
			// );

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

		if (edp_online_vehicles && edp_online_vehicles.vehicles_service && edp_online_vehicles.vehicles_service.add_scan_button) {
			edp_online_vehicles.vehicles_service.add_scan_button(frm);
		}
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




	vin_serial_no(frm) {
		if (frm.doc.vin_serial_no && frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.create_service.find_and_link_open_booking",
				args: {
					vin_serial_no: frm.doc.vin_serial_no,
					current_service_name: frm.doc.name
				},
				callback: function (r) {
					if (r.message && r.message.found) {
						// Only link and copy service_type; no other fields or parts/labour
						frm.set_value("service_booking", r.message.booking_name);
						frm.set_value("booking_name", r.message.booking_name);
						if (r.message.service_type != null && r.message.service_type !== "") {
							frm.set_value("service_type", r.message.service_type);
						}
						frappe.show_alert({
							message: __("Linked to open booking: {0}", [r.message.booking_name]),
							indicator: "green"
						}, 5);
					} else {
						
						if (!frm.doc.model) {
							frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
								.then((res) => {
									if (res.message && res.message.model) {
										frm.set_value("model", res.message.model);
										// Service Schedule will be linked when service_type is set
									}
								});
						}
					}
				}
			});
		}

		const dt = frm.doctype;
		const dn = frm.doc.name;

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
							"This vehicle was reported as stolen. Please contact Head Office immediately for more information"
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


		
	
		if (!frm.doc.odo_reading_hours) {
			frm.doc.odo_reading_hours = null;
			frm.refresh_field("odo_reading_hours");
		}

		// Service Date Check
		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_service_date",
				args: {
					vin: frm.doc.vin_serial_no,
				},
				callback(r) {
					if (!r.message) return;

					if (!r.message.is_valid) {
						// Skip if already set to Other by previous logic
						if (frm.doc.service_type && frm.doc.service_type.endsWith("-Other")) {
							console.log("Already Other type from previous logic... skipping (service date).");
							return;
						}

						frappe.msgprint(
							"Please note the selected vehicle falls outside the allocated service period parameters. Please contact Head Office for more information."
						);

						// ← FIXED: Using local dt/dn instead of undefined parameters
						frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
							.then((res) => {
								let model = res.message.model;
								let service_value = `SS-${model}-Other`;

								frappe.model.set_value(dt, dn, "service_type", service_value);
								frm.refresh_field("service_type");  // ← ADDED: Immediate UI refresh
							});
					}
				},
			});
		}

		// Warranty Date Check
		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_warranty_date",
				args: {
					vin: frm.doc.vin_serial_no,
				},
				callback(r) {
					if (!r.message) return;

					if (!r.message.is_valid) {
						// Skip if already set to Other
						if (frm.doc.service_type && frm.doc.service_type.endsWith("-Other")) {
							console.log("Already Other type... skipping update.");
							return;
						}

						frappe.msgprint(
							"Please note the selected vehicle falls outside the allocated warranty period. Please contact Head Office for more information."
						);

						// ← FIXED: Using local dt/dn
						frappe.db
							.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model")
							.then((res) => {
								let model = res.message.model;
								let service_value = `SS-${model}-Other`;

								frappe.model.set_value(dt, dn, "service_type", service_value);
								frm.refresh_field("service_type");  // ← ADDED: Immediate UI refresh
							});
					}
				},
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

	odo_reading_hours(frm) {
		const dt = frm.doctype;
		const dn = frm.doc.name;

		if (!frm.doc.service_type) {
			frm.set_value("odo_reading_hours", 0);
			frappe.model.set_value(dt, dn, "system_status", null);
			if (!odo_limit_message_shown) {
				odo_limit_message_shown = true;
				frappe.msgprint("Please select a Service Type and VIN/Serial No before setting the Odo Reading");
			}
			return;
		}

		if (frm.doc.odo_reading_hours > 0 && frm.doc.model) {
			frappe.db.get_value("Service Schedules", frm.doc.service_type, "interval").then((r) => {
				if (!r || !r.message || r.message.interval == null) return;
				let interval = r.message.interval;
				return frappe.db.get_value("Model Administration", frm.doc.model, [
					"service_type_max_allowance",
					"service_type_minimum_allowance",
				]).then((r2) => {
					if (!r2 || !r2.message) return;
					let max_allowance = parseInt(r2.message.service_type_max_allowance || 0, 10);
					let min_allowance = parseInt(r2.message.service_type_minimum_allowance || 0, 10);
					let min_odo_value = parseInt(interval, 10) - min_allowance;
					let max_odo_value = parseInt(interval, 10) + max_allowance;
					let odo = parseInt(frm.doc.odo_reading_hours, 10);

					if (!Number.isNaN(odo)) {
						const in_range = odo >= min_odo_value && odo <= max_odo_value;
						frappe.model.set_value(
							dt,
							dn,
							"system_status",
							in_range ? "Conditionally Approved" : "Conditionally Declined",
						);
						frm.refresh_field("system_status");
					}

					if (odo < min_odo_value) {
						if (!odo_limit_message_shown) {
							odo_limit_message_shown = true;
							if (!frm.doc.vin_serial_no) {
								frappe.msgprint("Please select VIN/Serial No first before entering odo reading.");
								return;
							}
							frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model").then((res) => {
								if (res && res.message && res.message.model) {
									frappe.model.set_value(dt, dn, "service_type", `SS-${res.message.model}-Other`);
									frm.refresh_field("service_type");
								}
							}).catch(() => frappe.msgprint("Could not fetch model for the selected VIN."));
							frappe.msgprint("Your vehicle hasn't reached its service threshold yet. Please check back when it meets the minimum mileage requirement.");
						}
					} else if (odo > max_odo_value) {
						if (!odo_limit_message_shown) {
							odo_limit_message_shown = true;
							frappe.msgprint("Your vehicle's mileage has exceeded the current service range. Please select the upcoming service schedule.");
						}
					}
				});
			});
		}

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
		// let mandatory = frm.doc.__mandatory_names;
		// let current_names = (frm.doc.attach_documents || [])
		// 	.map(row => row.document_name?.trim())
		// 	.filter(Boolean);

		// mandatory.forEach(name => {
		// 	if (!current_names.includes(name)) {
		// 		frappe.throw(
		// 			`Mandatory document name cannot be changed or replaced: "${name}"`
		// 		);
		// 	}
		// });

		//    if (!frm.doc.service_status || !frm.doc.__mandatory_names) {
		//     return;
		// }

		// let expected = frm.doc.__mandatory_names; 
		// let current = (frm.doc.attach_documents || []).map(row => row.document_name.trim());

		// if (expected.length !== current.length) {
		//     frappe.throw('You cannot add or remove mandatory document rows.');
		//     frappe.validated = false;
		//     return;
		// }

		// for (let name of expected) {
		//     if (!current.includes(name)) {
		//         frappe.throw(`You cannot change mandatory document name: "${name}"`);
		//         frappe.validated = false;
		//         return;
		//     }
		// }

		// for (let name of current) {
		//     if (!expected.includes(name)) {
		//         frappe.throw(`Invalid document name: "${name}". Keep original names only.`);
		//         frappe.validated = false;
		//         return;
		//     }
		// }
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
				// frappe.msgprint("Please select a service type before setting the Odo Reading Ahmad saeed");
			}

			frappe.validated = false;
			return;
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