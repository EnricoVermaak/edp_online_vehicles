// Copyright (c) 2024, NexTash and contributors
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

var VS_CONFIG = {
	parts: [
		{
			table: "service_parts_items",
			childtype: "Service Parts Items",
			item_field: "item",
			price_field: "price_excl",
			qty_field: "qty",
			total_field: "total_excl",
			gp_field: "custom_service_gp",
			apply_gp: true,
		},
		{
			table: "non_oem_parts_items",
			childtype: "Non OEM Parts Items",
			item_field: "item",
			price_field: "price_excl",
			qty_field: "qty",
			total_field: "total_excl",
			gp_field: null,
			apply_gp: false,
		},
	],
	labour: [
		{
			table: "service_labour_items",
			childtype: "Service Labour Items",
			item_field: "item",
			rate_field: "rate_hour",
			duration_field: "duration_hours",
			total_field: "total_excl",
			gp_field: "custom_service_gp",
			apply_gp: true,
		},
		{
			table: "non_oem_labour_items",
			childtype: "Non OEM Labour Items",
			item_field: "labour_code",
			rate_field: "rate_hour",
			duration_field: "duration_hours",
			total_field: "total_excl",
			gp_field: null,
			apply_gp: false,
		},
	],
	extras: {
		table: "transaction_list",
		childtype: "Extra Items",
		item_field: "item_no",
		price_field: "price_per_item_excl",
		qty_field: "qty",
		total_field: "total_excl",
	},
	totals: {
		parts: "parts_total_excl",
		labour: "labours_total_excl",
		extras: "extra_cost_total_excl",
		duration: "duration_total",
		qty: "total_items",
		summary_parts: "summary_parts_total",
		summary_labour: "summary_labour_total",
		summary_extras: "summary_extras_total",
		summary_total: "summary_total_excl",
	},
	labour_rate_field: "custom_service_labour_rate",
	company_source: "dealer",
};

edp_vehicles.pricing.bind_child_events(VS_CONFIG);

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
		if (!frm.doc.service_type) {
			frm.clear_table("service_parts_items");
			frm.clear_table("service_labour_items");
			frm.clear_table("non_oem_parts_items");
			frm.clear_table("non_oem_labour_items");
			frm.refresh_field("service_parts_items");
			frm.refresh_field("service_labour_items");
			frm.refresh_field("non_oem_parts_items");
			frm.refresh_field("non_oem_labour_items");
			edp_vehicles.pricing.recalc_totals(frm, VS_CONFIG);
			return;
		}

		let schedule = await frappe.db.get_doc("Service Schedules", frm.doc.service_type);

		let allow_labour = schedule.allow_users_to_add_edit_remove_labour || 0;
		let allow_parts = schedule.allow_users_to_add_edit_remove_parts || 0;

		frm.set_df_property("service_labour_items", "read_only", allow_labour ? 0 : 1);
		frm.set_df_property("non_oem_labour_items", "read_only", allow_labour ? 0 : 1);
		frm.set_value("edit_labour", allow_labour);

		frm.set_df_property("service_parts_items", "read_only", allow_parts ? 0 : 1);
		frm.set_df_property("non_oem_parts_items", "read_only", allow_parts ? 0 : 1);
		frm.set_value("edit_parts", allow_parts);

		await edp_vehicles.pricing.load_schedule(frm, frm.doc.service_type, VS_CONFIG);
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
					}
					frm.refresh_field("service_parts_items");
					edp_vehicles.pricing.recalc_totals(frm, VS_CONFIG);
				});
		}

		$(document).on("blur", '[data-fieldname="service_status"]', function () {
			if (!frm.doc.service_status || frm.doc.service_status === "") {
				frm.set_value("service_status", previous_status_value);
			}
		});

		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");
			frappe.db.get_list("Service Status", {
				filters: { is_default_status: 1 },
				fields: ["name"],
			}).then((serv_status) => {
				if (serv_status.length > 0) {
					frm.set_value("service_status", serv_status[0].name);
				}
			});
		}

		frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
			.then(r => {
				let labour_code_filter = r.message?.labour_code_filter || "Service Labour";
				frm.set_query("item", "service_labour_items", () => ({
					filters: { item_group: labour_code_filter }
				}));
			});

		frm.set_query("service_type", () => ({
			query: "edp_online_vehicles.events.service_type.service_type_query",
			filters: {
				model_code: frm.doc.model,
				vin_serial_no: frm.doc.vin_serial_no,
			},
		}));
		frm.set_query("inspection_template", () => ({
			filters: { type: "Service Inspection" }
		}));
		frm.set_query("vehicles_inspection_template", () => ({
			filters: { type: "Standard Service Checklist" }
		}));
		previous_status_value = frm.doc.service_status;
	},

	refresh(frm) {
		edp_vehicles.pricing.recalc_totals(frm, VS_CONFIG);

		frm.add_custom_button(__('Inspection'), function () {
			frappe.route_options = {
				vin_serial_no: frm.doc.vin_serial_no,
				odo_reading: frm.doc.odo_reading_hours,
				customer: frm.doc.customer,
				customer_address: frm.doc.customer_address,
				technician: frm.doc.technician
			};
			frappe.set_route("Form", "Vehicles Service Inspection", "new-vehicles-service-inspection");
		}, __('Create'));

		frappe.db.get_doc("Vehicle Service Settings").then((setting_doc) => {
			if (setting_doc.allow_auto_job_card_no) {
				if (!frm.doc.job_card_no) {
					var lastJobNo = setting_doc.last_auto_job_card_no;
					const prefix = setting_doc.auto_job_card_no_prefix;
					const number = lastJobNo.match(/\d+/)[0];
					const incrementedNumber = (parseInt(number, 10) + 1).toString().padStart(6, "0");
					frm.set_value("job_card_no", prefix + incrementedNumber);
				}
				frm.set_df_property("job_card_no", "read_only", 1);
			}
		});

		if (!frm.is_new()) {
			frm.add_custom_button("Part Order", function () {
				frappe.model.with_doctype("Part Order", function () {
					var doc = frappe.model.get_new_doc("Part Order");
					doc.dealer = frm.doc.dealer;
					doc.order_type = "Daily";
					doc.dealer_order_no = frm.doc.name;
					doc.delivery_method = "Delivery";
					doc.delivery_date = frm.doc.part_schedule_date;
					doc.sales_person = frappe.session.user;
					for (let child of frm.doc.service_parts_items) {
						var row = frappe.model.add_child(doc, "table_avsu");
						row.part_no = child.item;
						row.description = child.description;
						row.qty = child.qty;
						row.dealer_billing_excl = child.price_excl;
						row.total_excl = child.total_excl;
						row.dealer = frm.doc.dealer;
					}
					frappe.set_route("Form", doc.doctype, doc.name);
				});
			}, "Create");

			frm.add_custom_button("Internal Docs and Notes", () => {
				frappe.model.open_mapped_doc({
					method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_service.vehicles_service.create_internal_docs_notes",
					frm: frm,
				});
			}, "Create");

			frm.add_custom_button(__("Submit to DMS"), function () {
			}, __("Action"));
		}

// if (edp_online_vehicles && edp_online_vehicles.vehicles_service && edp_online_vehicles.vehicles_service.add_scan_button) {
		// 	edp_online_vehicles.vehicles_service.add_scan_button(frm);
		// }
	},
	refresh: function(frm) {
        frm.set_query("vin_serial_no", function() {
            return {
                filters: {
                    availability_status: "Sold"
                }
            };
        });
    },

	after_save(frm) {
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.service_status_change",
			args: { vinno: frm.doc.vin_serial_no, status: frm.doc.service_status },
			callback: function (r) {
				if (r.message) {
					frappe.show_alert({ message: r.message }, 5);
					frappe.db.get_list("Service Status", {
						filters: { automatically_submit_document: 1 },
						fields: ["name"],
					}).then((statuses) => {
						if (statuses.length > 0) {
							let status = statuses.map((s) => s.name);
							if (status == frm.doc.service_status) {
								frappe.call({
									method: "edp_online_vehicles.events.submit_document.submit_service_document",
									args: { doc: frm.doc.name },
									callback: function (r) {
										if (r.message) {
											frm.reload_doc().then(() => {
												frappe.show_alert({ message: r.message }, 5);
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
				frm.set_query("vin_serial_no", function() {
			return {
				filters: {
				   availability_status: "Sold"
				}
			};
		});
		if (frm.doc.vin_serial_no && frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.create_vehicle_service.find_and_link_open_booking",
				args: { vin_serial_no: frm.doc.vin_serial_no, current_service_name: frm.doc.name },
				callback: function (r) {
					if (r.message && r.message.found) {
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
			frappe.db.get_list("Vehicle Stock", {
				filters: { vin_serial_no: frm.doc.vin_serial_no, availability_status: "Stolen" },
				fields: ["name"],
			}).then((existing_services) => {
				if (existing_services.length > 0) {
					frm.set_value("vin_serial_no", null);
					frappe.throw("This vehicle was reported as stolen. Please contact Head Office immediately for more information");
				} else {
					let seven_days_ago = frappe.datetime.add_days(frappe.datetime.get_today(), -7);
					frappe.db.get_list("Vehicles Service", {
						filters: { vin_serial_no: frm.doc.vin_serial_no, creation: [">=", seven_days_ago] },
						fields: ["name"],
					}).then((existing_services) => {
						if (existing_services.length > 0) {
							frappe.msgprint("Please be aware that a service request for this vehicle has been submitted within the last 7 days.");
						}
					});
				}
			});
		}

		if (!frm.doc.odo_reading_hours) {
			frm.doc.odo_reading_hours = null;
			frm.refresh_field("odo_reading_hours");
		}

		if (frm.doc.vin_serial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.service_type.check_service_date",
				args: { vin: frm.doc.vin_serial_no },
				callback: function (service_res) {
					frappe.call({
						method: "edp_online_vehicles.events.service_type.check_warranty_date",
						args: { vin: frm.doc.vin_serial_no },
						callback: function (warranty_res) {
							const service_invalid = service_res.message && !service_res.message.is_valid;
							const warranty_invalid = warranty_res.message && !warranty_res.message.is_valid;
							if (!service_invalid && !warranty_invalid) return;
							if (frm.doc.service_type && frm.doc.service_type.endsWith("-Other")) return;

							const parts = [];
							if (service_invalid) parts.push("service period");
							if (warranty_invalid) parts.push("warranty period");
							frappe.msgprint("Please note the selected vehicle falls outside the allocated " +
								parts.join(" and ") + " parameters. Please contact Head Office for more information.");

							frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "model").then((res) => {
								let model = res.message.model;
								frappe.model.set_value(dt, dn, "service_type", `SS-${model}-Other`);
								frm.refresh_field("service_type");
							});
						},
					});
				},
			});
		}
	},

	inspection_template(frm) {
		if (frm.doc.inspection_template) {
			frm.doc.inspection_items = [];
			frappe.db.get_doc("Vehicles Inspection Template", frm.doc.inspection_template).then((doc) => {
				for (let row of doc.inspection_items) {
					frm.add_child("inspection_items", { description: row.description });
				}
				frm.refresh_field("inspection_items");
			});
		} else {
			frm.doc.inspection_items = [];
			frm.refresh_field("inspection_items");
		}
	},

	vehicles_inspection_template(frm) {
		if (frm.doc.vehicles_inspection_template) {
			frm.doc.standard_checklist = [];
			frappe.db.get_doc("Vehicles Inspection Template", frm.doc.vehicles_inspection_template).then((doc) => {
				for (let row of doc.inspection_items) {
					frm.add_child("standard_checklist", { description: row.description });
				}
				frm.refresh_field("standard_checklist");
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
			frappe.model.set_value(dt, dn, "system_status", null);
			frappe.msgprint("Please select a Service Type and VIN/Serial No before setting the Odo Reading");
			frm.doc.odo_reading_hours = null;
			frm.refresh_field("odo_reading_hours");
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
						frappe.model.set_value(dt, dn, "system_status", in_range ? "Conditionally Approved" : "Conditionally Declined");
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

		if (!frm.doc.vin_serial_no || !frm.doc.odo_reading_hours) return;

		frappe.call({
			method: "edp_online_vehicles.events.odo.validate_odo_reading",
			args: {
				vin_serial_no: frm.doc.vin_serial_no,
				odo_reading_hours: frm.doc.odo_reading_hours,
				doctype: frm.doctype,
				docname: frm.doc.name,
			},
			callback: function (r) {
				if (r.message.status === "failed") {
					frappe.msgprint(__("Odometer reading cannot be lower than the previous odometer reading"));
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
			frappe.db.get_doc("Vehicle Service Settings").then((setting_doc) => {
				if (setting_doc.allow_auto_job_card_no) {
					var lastJobNo = setting_doc.last_auto_job_card_no;
					const prefix = setting_doc.auto_job_card_no_prefix;
					const number = lastJobNo.match(/\d+/)[0];
					const incrementedNumber = (parseInt(number, 10) + 1).toString().padStart(6, "0");
					frm.set_value("job_card_no", prefix + incrementedNumber);
				}
			});
		}

		frappe.db.get_value("Service Status", { name: frm.doc.service_status }, "technician_started_job")
			.then((res) => {
				if (res.message.technician_started_job) {
					frm.set_value("start_date", frappe.datetime.now_datetime());
				}
			});

		frappe.db.get_value("Service Status", { name: frm.doc.service_status }, "technician_completed_job")
			.then((res) => {
				if (res.message.technician_completed_job) {
					frm.set_value("end_date", frappe.datetime.now_datetime());
				}
			});

		if (frm.doc.hasOwnProperty("vehicle_registration_number") && frm.doc.vehicle_registration_number) {
			await frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Vehicle Stock",
					name: frm.doc.vin_serial_no,
					fieldname: "register_no",
					value: frm.doc.vehicle_registration_number
				}
			});
		}

		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Vehicle Stock",
				name: frm.doc.vin_serial_no,
				fieldname: "odo_reading",
				value: frm.doc.odo_reading_hours
			}
		});
	},

	dealer: async function (frm) {
		if (!frm.doc.dealer) return;

		let r = await frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate");
		let new_rate = flt(r?.message?.custom_service_labour_rate || 0);

		for (const row of frm.doc.service_labour_items || []) {
			let rate = new_rate;
			if (row.item) {
				let item_doc = await frappe.db.get_doc("Item", row.item);
				let gp_pct = item_doc.custom_service_gp || 0;
				rate = new_rate + (new_rate * (gp_pct / 100));
			}
			row.rate_hour = rate;
			row.total_excl = rate * (row.duration_hours || 0);
		}

		(frm.doc.non_oem_labour_items || []).forEach(row => {
			row.rate_hour = new_rate;
			row.total_excl = new_rate * (row.duration_hours || 0);
		});

		frm.refresh_field("service_labour_items");
		frm.refresh_field("non_oem_labour_items");
		edp_vehicles.pricing.recalc_totals(frm, VS_CONFIG);
	}
});
