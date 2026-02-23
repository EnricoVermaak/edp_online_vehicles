// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt


let codeReader;
let previous_status_value = null;

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
			let attach = frm.doc.attach_documents || [];

			if (status_doc.documents) {
				status_doc.documents.forEach(doc => {
					let exists = attach.some(row => row.document_name === doc.document_name);
					if (!exists) {
						let row = frm.add_child('attach_documents');
						row.document_name = doc.document_name;
						if (doc.mandatory === 'Yes') {
							mandatory_names.push(doc.document_name);
						}
					}
				});
			}

			frm.refresh_field('attach_documents');
			frm.doc.__mandatory_names = mandatory_names;
		});
	},
	service_type: async function (frm) {

		// ===== IF EMPTY → CLEAR EVERYTHING =====
		if (!frm.doc.service_type) {
			frm.clear_table("service_parts_items");
			frm.clear_table("service_labour_items");
			frm.clear_table("non_oem_parts_items");
			frm.clear_table("non_oem_labour_items");

			frm.refresh_field("service_parts_items");
			frm.refresh_field("service_labour_items");
			frm.refresh_field("non_oem_parts_items");
			frm.refresh_field("non_oem_labour_items");
			return;
		}

		// ===== FETCH SCHEDULE =====
		let schedule = await frappe.db.get_doc("Service Schedules", frm.doc.service_type);

		let allow_labour = schedule.allow_users_to_add_edit_remove_labour || 0;
		let allow_parts = schedule.allow_users_to_add_edit_remove_parts || 0;

		// ===== APPLY READ ONLY RULES =====
		frm.set_df_property("service_labour_items", "read_only", allow_labour ? 0 : 1);
		frm.set_df_property("non_oem_labour_items", "read_only", allow_labour ? 0 : 1);
		frm.set_value("edit_labour", allow_labour);

		frm.set_df_property("service_parts_items", "read_only", allow_parts ? 0 : 1);
		frm.set_df_property("non_oem_parts_items", "read_only", allow_parts ? 0 : 1);
		frm.set_value("edit_parts", allow_parts);

		// ===== ALWAYS CLEAR BEFORE LOAD =====
		frm.clear_table("service_parts_items");
		frm.clear_table("service_labour_items");

		//          IMPORTANT CHANGE – LABOUR LOADING
		// 1. First get the company labour rate (once)
		let company_rate = 0;
		if (frm.doc.dealer) {
			let company_data = await frappe.db.get_value(
				"Company",
				frm.doc.dealer,
				"custom_service_labour_rate"
			);
			company_rate = flt(company_data?.message?.custom_service_labour_rate || 0);
		}

		// 2. Load labour rows — but FORCE rate from company setting
		(schedule.service_labour_items || []).forEach(labour => {
			let row = frm.add_child("service_labour_items");
			row.item = labour.item;
			row.description = labour.description || "";
			row.duration_hours = labour.duration_hours || 1;
			row.rate_hour = company_rate;
			row.total_excl = company_rate * row.duration_hours;
		});

		// ===== LOAD PARTS (unchanged) =====
		(schedule.service_parts_items || []).forEach(part => {
			let row = frm.add_child("service_parts_items");
			row.item = part.item;
			row.description = part.description || "";
			row.qty = part.qty || 1;
			row.price_excl = part.price_excl;
			row.total_excl = part.total_excl;
		});

		// ===== REFRESH UI =====
		frm.refresh_field("service_parts_items");
		frm.refresh_field("service_labour_items");
		frm.refresh_field("non_oem_parts_items");
		frm.refresh_field("non_oem_labour_items");

		calculate_parts_total_combined(frm);
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
		// refresh_summary_totals(frm);
	},
	onload(frm) {
		frappe.db.get_doc("Vehicle Service Settings").then((settings) => {
			let attach = frm.doc.attach_documents || [];
			let existing_names = new Set(attach.map(row => row.document_name));
			if (settings.mandatory_documents) {
				for (let man_row of settings.mandatory_documents) {
					if (man_row.document_name && !existing_names.has(man_row.document_name)) {
						frm.add_child("attach_documents", { document_name: man_row.document_name });
						existing_names.add(man_row.document_name);
					}
				}
			}
			frm.refresh_field("attach_documents");
		});
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
		// refresh_summary_totals(frm);
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


		frappe.db
			.get_doc("Vehicle Service Settings")
			.then((setting_doc) => {
				if (setting_doc.allow_auto_job_card_no) {
					if (!frm.doc.job_card_no) {

						var lastJobNo = setting_doc.last_auto_job_card_no;

						const prefix = setting_doc.auto_job_card_no_prefix;
						const number = lastJobNo.match(/\d+/)[0];

						const incrementedNumber = (parseInt(number, 10) + 1)
							.toString()
							.padStart(6, "0");

						const nextJobNo = prefix + incrementedNumber;
						console.log(nextJobNo);

						frm.set_value("job_card_no", nextJobNo);
					};

					frm.set_df_property("job_card_no", "read_only", 1);
				}
			});

		if (!frm.is_new()) {
			frm.add_custom_button("Part Order", function () {
				frappe.model.with_doctype("Part Order", function () {
					var doc = frappe.model.get_new_doc("Part Order");
					doc.dealer = frm.doc.dealer
					doc.order_type = "Daily"
					doc.dealer_order_no = frm.doc.name
					doc.delivery_method = "Delivery"
					doc.delivery_date = frm.doc.part_schedule_date
					doc.sales_person = frappe.session.user

					for (let child of frm.doc.service_parts_items) {
						var row = frappe.model.add_child(
							doc,
							"table_avsu",
						);
						row.part_no = child.item;
						row.description = child.description;
						row.qty = child.qty;
						row.dealer_billing_excl = child.price_excl;
						row.total_excl = child.total_excl;
						row.dealer = frm.doc.dealer
					}
					frappe.set_route("Form", doc.doctype, doc.name);
				});
			}, "Create");
		}



		if (!frm.is_new()) {

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
		// Reverse flow: Find and link open booking when VIN is entered (only for new documents)
		if (frm.doc.vin_serial_no && frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.create_vehicle_service.find_and_link_open_booking",
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
						// No booking found - try to link Service Schedule based on model
						// Get model from VIN if not already set
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

		// Range check: require service_type first
		if (!frm.doc.service_type) {
			frm.set_value("odo_reading_hours", 0);
			// Reset system_status if we cannot evaluate the range
			frappe.model.set_value(dt, dn, "system_status", null);
			frappe.msgprint("Please select a Service Type and VIN/Serial No before setting the Odo Reading");
			return;
		}

		// Range check: ODO vs schedule interval ± allowances
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

					// Set system_status based on whether ODO is inside the allowed range
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
					} else if (odo > max_odo_value) {
						frappe.msgprint("Your vehicle's mileage has exceeded the current service range. Please select the upcoming service schedule.");
					}
				});
			});
		}

        // Rollback check: ODO cannot be lower than previous service (unless allowed in settings)
        frappe.call({
            method: "edp_online_vehicles.events.odo.validate_odo_reading",
            args: {
                vin_serial_no: frm.doc.vin_serial_no,
                odo_reading_hours: frm.doc.odo_reading_hours
            },
            callback: function (r) {

                if (r.message.status === "failed") {

                    frappe.msgprint(
                        __("Odometer cannot be lower than {0}", [r.message.stock_odo])
                    );

                    frm.set_value("odo_reading_hours", null);
                    frm.refresh_field("odo_reading_hours");
                }
            }
        });
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
		
   		//Save the service odometer reading back to the linked Vehicle Stock record (Not implemented will do later as hook?)
        if (!frm.doc.vin_serial_no || !frm.doc.odo_reading_hours) {
            return;
        }

        let r = await frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Vehicle Stock",
                filters: { name: frm.doc.vin_serial_no },
                fieldname: "odo_reading"
            }
        });

        let stock_odo = r.message.odo_reading || 0;

        if (parseFloat(frm.doc.odo_reading_hours) > parseFloat(stock_odo)) {
            await frappe.call({
                method: "frappe.client.set_value",
                args: {
                    doctype: "Vehicle Stock",
                    name: frm.doc.vin_serial_no,
                    fieldname: "odo_reading",
                    value: frm.doc.odo_reading_hours
                }
            });
        }
	},
});
// -----------------------------------------------------
// -----------------------------------------------------

frappe.ui.form.on("Service Parts Items", {
	item(frm, cdt, cdn) {
		vehicle_service_part_price(frm, cdt, cdn).then(() => {
			calculate_parts_total_combined(frm);
			frm.refresh_field("service_parts_items");
		});
	},

	service_parts_items_remove(frm) {
		calculate_parts_total_combined(frm);
	},

	price_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
		calculate_parts_total_combined(frm);
	},

	qty(frm, cdt, cdn) {
		// Sync total so save keeps correct value
		let row = locals[cdt][cdn];
		let total = (row.price_excl || 0) * (row.qty || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("service_parts_items");
		calculate_parts_total_combined(frm);
	},

	total_excl(frm, cdt, cdn) {
		calculate_parts_total_combined(frm);
	},
});

// -----------------------------------------------------
// NON OEM PARTS (no GP, manual price; total_excl = qty × price_excl; feeds into same parts_total_excl)
// -----------------------------------------------------

frappe.ui.form.on("Non OEM Parts Items", {
	qty(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let total = (row.price_excl || 0) * (row.qty || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("non_oem_parts_items");
		calculate_parts_total_combined(frm);
	},
	price_excl(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let total = (row.price_excl || 0) * (row.qty || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("non_oem_parts_items");
		calculate_parts_total_combined(frm);
	},
	total_excl(frm, cdt, cdn) {
		calculate_parts_total_combined(frm);
	},
	non_oem_parts_items_remove(frm) {
		calculate_parts_total_combined(frm);
	},
});

// -----------------------------------------------------
// UNIVERSAL EVENTS – LABOUR (same formula: dealer Service Labour Rate + Item GP% whether from schedule or manual)
// -----------------------------------------------------

frappe.ui.form.on("Service Labour Items", {
	item(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (!row.item || !frm.doc.dealer) return;

		frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate")
			.then(r => {
				let rate = flt(r?.message?.custom_service_labour_rate || 0);
				console.log("Rate", rate);

				frappe.model.set_value(cdt, cdn, {
					rate_hour: rate,
					total_excl: rate * flt(row.duration_hours || 0)
				});
			})
			.then(() => {
				calculate_labours_total_combined(frm);
				calculate_duration_total_combined(frm);
				frm.refresh_field("service_labour_items");
			});
	},

	service_labour_items_remove(frm) {
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
	},

	rate_hour(frm, cdt, cdn) {
		calculate_labour_total(frm, cdt, cdn);
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
		frm.refresh_field("service_labour_items");
	},

	duration_hours(frm, cdt, cdn) {
		// Sync total so save keeps correct value
		let row = locals[cdt][cdn];
		let total = (row.rate_hour || 0) * (row.duration_hours || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("service_labour_items");
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
	},

	total_excl(frm, cdt, cdn) {
		calculate_labours_total_combined(frm);
	},
});

// -----------------------------------------------------
// NON OEM LABOUR (same formula: Company labour rate + Item custom_service_gp; feeds into labours_total_excl + duration_total)
// -----------------------------------------------------

frappe.ui.form.on("Non OEM Labour Items", {
	labour_code(frm, cdt, cdn) {
		vehicle_service_labour_rate_company_only(frm, cdt, cdn).then(() => {
			frm.refresh_field("non_oem_labour_items");
			calculate_labours_total_combined(frm);
			calculate_duration_total_combined(frm);
		});
	},
	duration_hours(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let total = (row.rate_hour || 0) * (row.duration_hours || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("non_oem_labour_items");
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
	},
	rate_hour(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let total = (row.rate_hour || 0) * (row.duration_hours || 0);
		frappe.model.set_value(cdt, cdn, "total_excl", total);
		frm.refresh_field("non_oem_labour_items");
		calculate_labours_total_combined(frm);
	},
	total_excl(frm, cdt, cdn) {
		calculate_labours_total_combined(frm);
	},
	non_oem_labour_items_remove(frm) {
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
	},
});

// -----------------------------------------------------
// UNIVERSAL EVENTS – EXTRA ITEMS
// -----------------------------------------------------

// Summary totals (Parts + Labour + Extras, combined Total Excl)
// function refresh_summary_totals(frm) {
// 	if (!frm.doc.doctype) return;
// 	let parts = flt(frm.doc.parts_total_excl) || 0;
// 	let labour = flt(frm.doc.labours_total_excl) || 0;
// 	let extras = flt(frm.doc.extra_cost_total_excl) || 0;
// 	frm.set_value("summary_parts_total", parts);
// 	frm.set_value("summary_labour_total", labour);
// 	frm.set_value("summary_extras_total", extras);
// 	frm.set_value("summary_total_excl", parts + labour + extras);
// 	frm.refresh_field("summary_parts_total");
// 	frm.refresh_field("summary_labour_total");
// 	frm.refresh_field("summary_extras_total");
// 	frm.refresh_field("summary_total_excl");
// }

frappe.ui.form.on("Extra Items", {
	item_no(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.item_no) return;
		frappe.db.get_value("Item Price", { item_code: row.item_no, price_list: "Standard Selling" }, "price_list_rate")
			.then(r => {
				let msg = r && r.message;
				let rate = (msg != null && typeof msg === "object") ? (msg.price_list_rate || 0) : (msg != null ? msg : 0);
				frappe.model.set_value(cdt, cdn, "price_per_item_excl", rate);
				let total = rate * (row.qty || 0);
				frappe.model.set_value(cdt, cdn, "total_excl", total);
				frm.refresh_field("transaction_list");
				calculate_sub_total(frm, "extra_cost_total_excl", "transaction_list");
			});
	},
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

// Parts: Standard Selling + (Standard Selling × Item custom_service_gp / 100)
function vehicle_service_part_price(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	if (!row.item) return Promise.resolve();

	return frappe.db.get_value("Item Price", { item_code: row.item, price_list: "Standard Selling" }, "price_list_rate")
		.then(price_res => {
			let msg = price_res && price_res.message;
			let standard_rate = (msg != null && typeof msg === "object") ? (msg.price_list_rate || 0) : (msg != null ? msg : 0);
			return frappe.db.get_doc("Item", row.item).then(item_doc => {
				let gp_pct = item_doc.custom_service_gp || 0;
				let price_excl = standard_rate + (standard_rate * (gp_pct / 100));
				let total_excl = price_excl * (row.qty || 0);
				frappe.model.set_value(cdt, cdn, "price_excl", price_excl);
				frappe.model.set_value(cdt, cdn, "total_excl", total_excl);
			});
		});
}

// Labour: dealer Company Service Labour Rate + (that × Item custom_service_gp / 100)
// item_field: "item" for Service Labour Items
function vehicle_service_labour_rate(frm, cdt, cdn, item_field) {
	item_field = item_field || "item";
	let row = locals[cdt][cdn];
	let item_code = row[item_field];
	if (!item_code || !frm.doc.dealer) return Promise.resolve();

	return frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate")
		.then(company_res => {
			let msg = company_res && company_res.message;
			let base_rate = (msg != null && typeof msg === "object") ? (msg.custom_service_labour_rate || 0) : (msg != null ? msg : 0);
			return frappe.db.get_doc("Item", item_code).then(item_doc => {
				let gp_pct = item_doc.custom_service_gp || 0;
				let rate_hour = base_rate + (base_rate * (gp_pct / 100));
				let total_excl = rate_hour * (row.duration_hours || 0);
				frappe.model.set_value(cdt, cdn, "rate_hour", rate_hour);
				frappe.model.set_value(cdt, cdn, "total_excl", total_excl);
			});
		});
}

// Non OEM Labour: Company Service Labour Rate only (no Item GP)
function vehicle_service_labour_rate_company_only(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	if (!frm.doc.dealer) return Promise.resolve();

	return frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate")
		.then(company_res => {
			let msg = company_res && company_res.message;
			let rate_hour = (msg != null && typeof msg === "object") ? (msg.custom_service_labour_rate || 0) : (msg != null ? msg : 0);
			let total_excl = rate_hour * (row.duration_hours || 0);
			frappe.model.set_value(cdt, cdn, "rate_hour", rate_hour);
			frappe.model.set_value(cdt, cdn, "total_excl", total_excl);
		});
}

// After loading from service schedule: recalc every parts and labour row with same formula
function recalc_all_parts_and_labour(frm) {
	let parts_promises = (frm.doc.service_parts_items || []).map(row =>
		vehicle_service_part_price(frm, "Service Parts Items", row.name)
	);
	let labour_promises = (frm.doc.service_labour_items || []).map(row =>
		vehicle_service_labour_rate(frm, "Service Labour Items", row.name)
	);
	let non_oem_labour_promises = (frm.doc.non_oem_labour_items || []).map(row =>
		vehicle_service_labour_rate_company_only(frm, "Non OEM Labour Items", row.name)
	);
	return Promise.all([...parts_promises, ...labour_promises, ...non_oem_labour_promises]).then(() => {
		frm.refresh_field("service_parts_items");
		frm.refresh_field("service_labour_items");
		frm.refresh_field("non_oem_labour_items");
		calculate_parts_total_combined(frm);
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
		frm.refresh_field("parts_total_excl");
		frm.refresh_field("labours_total_excl");
		frm.refresh_field("duration_total");
		// refresh_summary_totals(frm);
	});
}

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
	// refresh_summary_totals(frm);
};

// Parts total = OEM parts total_excl + Non OEM parts total_excl (one combined total)
const calculate_parts_total_combined = (frm) => {
	let oem = 0;
	for (const row of frm.doc.service_parts_items || []) {
		oem += row.total_excl || 0;
	}
	let non_oem = 0;
	for (const row of frm.doc.non_oem_parts_items || []) {
		non_oem += row.total_excl || 0;
	}
	frappe.model.set_value(frm.doc.doctype, frm.doc.name, "parts_total_excl", oem + non_oem);
	// refresh_summary_totals(frm);
};

// LABOUR HOURS (single table)
const calculate_labour_hours = (frm, field_name, table_name) => {
	let hours_total = 0;

	for (const row of frm.doc[table_name] || []) {
		hours_total += row.duration_hours || 0;
	}

	frappe.model.set_value(frm.doc.doctype, frm.doc.name, field_name, hours_total);
};

// Labour total = OEM labour total_excl + Non OEM labour total_excl; duration_total = sum of both tables' duration_hours
const calculate_labours_total_combined = (frm) => {
	let oem = 0;
	for (const row of frm.doc.service_labour_items || []) {
		oem += row.total_excl || 0;
	}
	let non_oem = 0;
	for (const row of frm.doc.non_oem_labour_items || []) {
		non_oem += row.total_excl || 0;
	}
	frappe.model.set_value(frm.doc.doctype, frm.doc.name, "labours_total_excl", oem + non_oem);
	// refresh_summary_totals(frm);
};

const calculate_duration_total_combined = (frm) => {
	let hours = 0;
	for (const row of frm.doc.service_labour_items || []) {
		hours += row.duration_hours || 0;
	}
	for (const row of frm.doc.non_oem_labour_items || []) {
		hours += row.duration_hours || 0;
	}
	frappe.model.set_value(frm.doc.doctype, frm.doc.name, "duration_total", hours);
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
