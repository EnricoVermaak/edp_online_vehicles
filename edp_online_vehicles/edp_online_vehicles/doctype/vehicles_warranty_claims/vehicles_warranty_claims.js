// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;
let codeReader;

$(document).ready(function () {
	frappe.require(
		"https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js",
		function () {
			codeReader = new ZXing.BrowserMultiFormatReader();
		},
	);
});

var WC_CONFIG = {
	parts: [{
		table: "part_items",
		childtype: "Warranty Part Item",
		item_field: "part_no",
		price_field: "price",
		qty_field: "qty",
		total_field: "total_excl",
		gp_field: "custom_warranty_gp",
		gp_row_field: "item_warranty_gp",
		apply_gp: true,
	}],
	labour: [{
		table: "labour_items",
		childtype: "Warranty Labour Item",
		item_field: "labour_code",
		rate_field: "price",
		duration_field: "duration",
		total_field: "total_excl",
		gp_field: "custom_warranty_gp",
		apply_gp: true,
	}],
	extras: {
		table: "extra_items",
		childtype: "Extra Items",
		item_field: "item_no",
		price_field: "price_per_item_excl",
		qty_field: "qty",
		total_field: "total_excl",
	},
	totals: {
		parts: "total_excl",
		labour: "labours_total_excl",
		extras: "extra_cost_total_excl",
		duration: "duration_total",
		qty: "total_items",
		summary_parts: "summary_parts_total",
		summary_labour: "summary_labour_total",
		summary_extras: "summary_extras_total",
		summary_total: "summary_total_excl",
	},
	labour_rate_field: "custom_warranty_labour_rate",
	company_source: "dealer",
};

edp_vehicles.pricing.bind_child_events({
	parts: [],
	labour: WC_CONFIG.labour,
	extras: WC_CONFIG.extras,
	totals: WC_CONFIG.totals,
	labour_rate_field: WC_CONFIG.labour_rate_field,
	company_source: WC_CONFIG.company_source,
});

frappe.ui.form.on("Vehicles Warranty Claims", {
	onload_post_render: function (frm) {
		frm.fields_dict['date_of_failure'].datepicker.update({
			maxDate: new Date(frappe.datetime.get_today())
		});
	},

	refresh(frm) {
		setTimeout(() => reapply_colors(frm), 300);
		edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
		load_claim_warranty_plans(frm);

		const has_no_mandatory_rows = !frm.doc.mandatory_documents || frm.doc.mandatory_documents.length === 0;
		if (has_no_mandatory_rows) {
			frm.clear_table("mandatory_documents");
			frappe.db.get_doc("Vehicles Warranty Settings").then((settings) => {
				if (settings.mandatory_documents && settings.mandatory_documents.length) {
					for (let row of settings.mandatory_documents) {
						frm.add_child("mandatory_documents", { document_name: row.document_name });
					}
					frm.refresh_field("mandatory_documents");
				}
			});
		}
		if (frm.fields_dict.mandatory_documents && frm.fields_dict.mandatory_documents.grid) {
			frm.fields_dict.mandatory_documents.grid.wrapper.find(".grid-remove-rows").hide();
			frm.fields_dict.mandatory_documents.grid.cannot_add_rows = true;
			frm.refresh_field("mandatory_documents");
		}

		frappe.db.get_value("Vehicles Warranty Settings", "Vehicles Warranty Settings", "labour_code_filter")
			.then(r => {
				let labour_code_filter = r.message?.labour_code_filter || "Warranty Labour";
				frm.set_query("labour_code", "labour_items", () => ({
					filters: { item_group: labour_code_filter }
				}));
			});

		frm.add_custom_button(__("Sales Order"), () => {
			if (!frm.doc.parts.length > 0) {
				frappe.throw("Please Enter data in parts child table first");
			} else if (!frm.doc.part_schedule_date) {
				frappe.throw("Please select a Scheduled Delivery Date under Parts Table");
			} else {
				frappe.call({
					method: "edp_online_vehicles.events.create_sales_order.create_sales_order_warranty",
					args: { docname: frm.doc.name },
					callback: function (r) { if (r.message) frappe.msgprint(r.message); },
				});
			}
		}, __("Create"));

		frm.add_custom_button("Material Request", () => {
			if (!frm.doc.service_parts_items.length > 0 && !frm.doc.service_labour_items.length > 0) {
				frappe.throw("Please Enter data in child tables first");
			} else if (!frm.doc.part_schedule_date) {
				frappe.throw("Please select a Scheduled Delivery Date under Parts Table");
			} else {
				frappe.call({
					method: "edp_online_vehicles.events.create_material_request.create_material_request_warranty",
					args: { docname: frm.doc.name },
					callback: function (r) { if (r.message) frappe.msgprint(r.message); },
				});
			}
		}, "Create");

		frm.add_custom_button("Internal Docs and Notes", () => {
			frappe.model.open_mapped_doc({
				method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_warranty_claims.vehicles_warranty_claims.create_internal_docs_notes",
				frm: frm,
			});
		}, "Create");

		if (frappe.user_roles.includes("Warranty Administrator") || frappe.session.user === "Administrator") {
			frm.add_custom_button(__("Submit to DMS"), () => {
				frappe.confirm(__("Mark this warranty claim as submitted to DMS?"), () => {
					frm.set_value("submitted_to_dms", frappe.datetime.now_datetime());
					frm.save();
				});
			}, __("Actions"));
		}

		frm.add_custom_button("Scan", () => {
			let codeReader = new ZXing.BrowserMultiFormatReader();
			let d = new frappe.ui.Dialog({
				title: "Scan",
				fields: [{ label: "Camera Feed", fieldname: "camera_feed", fieldtype: "HTML" }],
				primary_action_label: "Close",
				primary_action() {
					d.hide();
					codeReader.reset();
					d.get_field("camera_feed").$wrapper[0].innerHTML = "";
				},
			});
			d.show();
			const cameraContainer = d.get_field("camera_feed").$wrapper[0];
			cameraContainer.innerHTML = '<video id="video" width="100%" height="300px" autoplay muted></video>';
			codeReader.decodeFromVideoDevice(null, "video", (result, err) => {
				if (result) {
					let scannedText = result.getText();
					let segments = scannedText.split("%").filter((s) => s.trim() !== "");
					if (segments.length >= 14) {
						let vin = segments[11];
						frappe.call({
							method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
							args: { vinno: vin },
							callback: function (r) {
								if (r.message) {
									frm.set_value("vin_serial_no", vin).then(() => {
										frm.set_value("engine_no", segments[12]);
										frm.set_value("colour", segments[10]);
										frm.set_value("brand", segments[8]);
									});
									frm.set_value("license_no", segments[5]);
									frm.set_value("license_expiry_date", segments[13]);
									frm.set_value("vehicle_registration_number", segments[6]);
								} else {
									frappe.db.get_value("Company", { name: frm.doc.dealer }, "custom_allow_any_brand_for_dealership")
										.then((res) => {
											if (res.message.custom_allow_any_brand_for_dealership) {
												frappe.call({
													method: "edp_online_vehicles.events.service_methods.create_vehicle",
													args: {
														vinno: vin, colour: segments[10], license_no: segments[5],
														license_expiry_date: segments[13], engine_no: segments[12],
														veh_reg_no: segments[6], brand: segments[8],
													},
													callback: function (r) {
														if (r.message) frappe.show_alert({ message: __("Vehicle successfully created"), indicator: "green" }, 20);
														else frappe.show_alert({ message: __("Failed to create Vehicle. Please contact support: support@tecwise.co.za"), indicator: "red" }, 20);
													},
												});
											} else {
												frappe.show_alert({ message: __("The scanned Vehicle does not exist on the system. Please contact head office and ask them to load the vehicle on the system."), indicator: "orange" }, 15);
											}
										});
								}
							},
						});
					} else {
						try {
							let urlObj = new URL(scannedText);
							let pathSegments = urlObj.pathname.split("/").filter((s) => s !== "");
							if (pathSegments.length > 0) {
								let vin = pathSegments[pathSegments.length - 1];
								frappe.call({
									method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
									args: { vinno: vin },
									callback: function (r) {
										if (r.message) frm.set_value("vin_serial_no", vin);
										else frappe.show_alert({ message: __("Vin/Serial No not on system. Please contact Head Office."), indicator: "red" }, 20);
									},
								});
							} else {
								frappe.msgprint("Vin/Serial No not recognised");
							}
						} catch (e) {
							frappe.msgprint("Barcode format not recognized.");
						}
					}
					d.hide();
					codeReader.reset();
					cameraContainer.innerHTML = "";
				}
				if (err && !(err instanceof ZXing.NotFoundException)) {
					console.error(err);
					frappe.msgprint("Scanning error: " + err);
				}
			});
		});
	},

	onload: function (frm) {
		frm.fields_dict['part_items'].grid.get_field('part_no').get_query = function () {
			return { filters: { "item_group": "Parts" } };
		};
		if (frm.doc.vehicles_incidents) {
			frappe.db.get_doc("Vehicles Incidents", frm.doc.vehicles_incidents).then((doc) => {
				for (let row of doc.parts) {
					frm.add_child("part_items", {
						part_no: row.item || "", description: row.description || "",
						qty: row.qty || 0, price: row.price_excl || 0, uom: row.uom || "",
					});
				}
				frm.refresh_field("part_items");
				edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
			});
		}

		$(document).on("blur", '[data-fieldname="status"]', function () {
			if (!frm.doc.status || frm.doc.status === "") {
				frm.set_value("status", previous_status_value);
			}
		});

		if (frm.is_new()) {
			frm.set_value('reported_by', frappe.session.user);
			frm.doc.dealer = frappe.defaults.get_default("company");
			frappe.db.get_list("Warranty Status", {
				filters: { is_default_status: 1 }, fields: ["name"],
			}).then((war_status) => {
				if (war_status.length > 0) frm.set_value("status", war_status[0].name);
			});
		}
		previous_status_value = frm.doc.status;
		toggle_summary_fields(frm);
		calculate_part_sub_total(frm, "total_excl", "part_items");
	},

	date_of_failure: async function (frm) {
		if (!frm.doc.vin_serial_no || !frm.doc.date_of_failure) return;
		let vs = await frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, ["service_start_date", "service_end_date"]);
		if (!vs || !vs.message) return;
		let start = vs.message.service_start_date;
		let end = vs.message.service_end_date;
		if (!start || !end) return;
		frm.set_value("type", (frm.doc.date_of_failure >= start && frm.doc.date_of_failure <= end) ? "Normal" : "Goodwill");
	},

	odo_reading: async function (frm) {
		if (!frm.doc.odo_reading || !frm.doc.vin_serial_no) return;
		const vs = await frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, "warranty_km_hours_limit");
		if (vs?.message?.warranty_km_hours_limit === frm.doc.odo_reading) {
			frm.set_value("type", "Goodwill");
		}
		frappe.call({
			method: "edp_online_vehicles.events.odo.validate_odo_reading",
			args: {
				vin_serial_no: frm.doc.vin_serial_no,
				odo_reading_hours: frm.doc.odo_reading,
				doctype: frm.doctype, docname: frm.doc.name,
			},
			callback: function (r) {
				if (r.message.status === "failed") {
					frappe.msgprint(__("Odometer reading cannot be lower than the previous odometer reading"));
					frm.set_value("odo_reading", null);
					frm.refresh_field("odo_reading");
				}
			}
		});
	},

	dealer: async function (frm) {
		if (!frm.doc.dealer || !frm.doc.labour_items || !frm.doc.labour_items.length) return;
		let r = await frappe.db.get_value("Company", frm.doc.dealer, "custom_warranty_labour_rate");
		let base_rate = flt(r?.message?.custom_warranty_labour_rate || 0);
		for (let row of frm.doc.labour_items) {
			if (!row.labour_code) continue;
			let gp_res = await frappe.db.get_value("Item", row.labour_code, "custom_warranty_gp");
			let gp_pct = flt(gp_res?.message?.custom_warranty_gp || 0);
			let price = base_rate + (base_rate * (gp_pct / 100));
			frappe.model.set_value(row.doctype, row.name, "price", price);
			frappe.model.set_value(row.doctype, row.name, "total_excl", price * (row.duration || 0));
		}
		frm.refresh_field("labour_items");
		edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
	},

	vin_serial_no: function (frm) {
		// Clear warranty summary fields first, then reload from VIN
		frm.set_value("warranty_start_date", null);
		frm.set_value("warranty_end_date", null);
		frm.set_value("warranty_period_years", null);
		frm.set_value("warranty_km_hours_limit", null);
		frm.set_value("extended_warranty_start_date", null);
		frm.set_value("extended_warranty_end_date", null);
		frm.set_value("extended_warranty_period", null);
		load_claim_warranty_plans(frm);
		if (frm.doc.part_items && frm.doc.part_items.length > 0) {
			setTimeout(() => reapply_colors(frm), 400);
		}
		if (!frm.doc.vin_serial_no) return;
		if (frm.doc.odo_reading) validate_odo_reading(frm);

		if (frm.is_new()) {
			frappe.db.get_list("Vehicle Stock", {
				filters: { vin_serial_no: frm.doc.vin_serial_no, availability_status: "Stolen" },
				fields: ["name"],
			}).then((existing_services) => {
				if (existing_services.length > 0) {
					frm.set_value("vin_serial_no", null);
					frappe.throw("This vehicles was reported as stolen. Please contact Head Office immediately for more information");
				} else {
					let seven_days_ago = frappe.datetime.add_days(frappe.datetime.get_today(), -7);
					frappe.db.get_list("Vehicles Warranty Claims", {
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
		frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
			if (convert_out_of_warranty_to_goodwill) {
				if (frm.doc.vin_serial_no && frm.doc.type !== "Goodwill") {
					frappe.call({
						method: "edp_online_vehicles.events.service_type.check_warranty_date",
						args: { vin: frm.doc.vin_serial_no },
						callback(r) {
							if (!r.message) return;
							if (!r.message.is_valid) {
								if (frm.doc.type !== "Goodwill") frm.set_value("type", "Goodwill");
								frappe.msgprint("Please note the selected vehicle falls outside the allocated warranty period parameters. Please contact Head Office for more information");
							}
						},
					});
				}
			}
		});
	},

	before_save: async function(frm) {
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Vehicle Stock", name: frm.doc.vin_serial_no,
				fieldname: "odo_reading", value: frm.doc.odo_reading
			}
		});
	},

	after_save(frm) {
		setTimeout(() => reapply_colors(frm), 400);
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.warranty_status_change",
			args: { vinno: frm.doc.vin_serial_no, status: frm.doc.status },
			callback: function (r) { if (r.message) frappe.msgprint(r.message); },
		});
		frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
			if (convert_out_of_warranty_to_goodwill) {
				if (frm.doc.vin_serial_no && frm.doc.type !== "Goodwill") {
					frappe.call({
						method: "edp_online_vehicles.events.service_type.check_warranty_date",
						args: { vin: frm.doc.vin_serial_no },
						callback(r) {
							if (!r.message) return;
							if (!r.message.is_valid) {
								if (frm.doc.type !== "Goodwill") frm.set_value("type", "Goodwill");
								frappe.msgprint("Please note the selected vehicle falls outside the allocated warranty period parameters. Please contact Head Office for more information");
							}
						},
					});
				}
			}
		});
	},
});

function validate_odo_reading(frm) {
	if (!frm.doc.vin_serial_no || !frm.doc.odo_reading) return;
	frappe.db.get_doc("Vehicles Warranty Settings", frm.doc.convert_out_of_warranty_to_goodwill).then(convert_out_of_warranty_to_goodwill => {
		if (convert_out_of_warranty_to_goodwill) {
			frappe.db.get_doc("Vehicle Stock", frm.doc.vin_serial_no).then(vehicle => {
				if (!vehicle.warranty_km_hours_limit) return;
				if (frm.doc.odo_reading > vehicle.warranty_km_hours_limit) {
					if (frm.doc.type !== "Goodwill") {
						frm.set_value("type", "Goodwill");
						frappe.msgprint({ message: "Please note the selected vehicle Odo Reading falls outside the allocated warranty plan parameters. Please contact Head Office for more information", indicator: "orange" });
					}
				} else {
					if (frm.doc.type === "Goodwill") frm.set_value("type", "Normal");
				}
			});
		}
	});

	frappe.db.get_single_value("Vehicles Warranty Claims Settings", "allow_warranty_odo_reading_roll_back")
		.then((allow_odo_rollback) => {
			if (allow_odo_rollback) return;
			frappe.db.get_list("Vehicles Warranty Claims", {
				filters: { vin_serial_no: frm.doc.vin_serial_no, name: ["!=", frm.doc.name] },
				fields: ["odo_reading"],
			}).then((records) => {
				let biggest_reading = 0;
				(records || []).forEach((reading) => {
					if (reading.odo_reading && reading.odo_reading > biggest_reading) biggest_reading = reading.odo_reading;
				});
				if (biggest_reading && frm.doc.odo_reading < biggest_reading) {
					frm.set_value("odo_reading", null);
					frappe.throw(__("The entered odometer reading cannot be lower than the previous warranty claim reading of {0}.", [biggest_reading]));
				}
			});
		});
}

frappe.ui.form.on('Warranty Part Item', {
	part_no: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.part_no) return;

		frappe.db.get_doc('Item', row.part_no).then(item_doc => {
			if (item_doc.item_group !== "Parts") {
				frappe.msgprint({ title: __('Error'), message: __('Selected item is not a Part. Only Parts are allowed.'), indicator: 'red' });
				frappe.model.set_value(cdt, cdn, 'part_no', null);
				return;
			}

			frappe.db.get_value('Item Price', { item_code: row.part_no, price_list: 'Standard Selling' }, 'price_list_rate')
				.then(prices => {
					let msg = prices && prices.message;
					let standard_rate = (msg != null && typeof msg === "object") ? (msg.price_list_rate || 0) : (msg != null ? msg : 0);
					let custom_gp = item_doc.custom_warranty_gp || 0;
					let price = standard_rate + (standard_rate * (custom_gp / 100));
					let total_excl = price * (row.qty || 0);
					frappe.model.set_value(cdt, cdn, 'price', price);
					frappe.model.set_value(cdt, cdn, 'total_excl', total_excl);
					frappe.model.set_value(cdt, cdn, "item_warranty_gp", custom_gp);
					frm.refresh_field('part_items');
					edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
				});
		});

		frappe.call({
			method: "edp_online_vehicles.events.odo.check_duplicate_part",
			args: { vin: frm.doc.vin_serial_no, part_no: row.part_no, current_claim: frm.doc.name },
			callback(r) {
				if (r.message && r.message.is_duplicate) {
					let claim_numbers = r.message.claims || [];
					let system_note = "Duplicate Parts Found";
					if (claim_numbers.length > 0) system_note += ": " + claim_numbers.join(", ");
					frappe.model.set_value(row.doctype, row.name, "system_note", system_note);
					set_row_color(frm, row, "#ffcc99");
				}
			}
		});
		validate_part_item(frm, row);
	},

	price(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_excl", (row.price || 0) * (row.qty || 0));
		frm.refresh_field("part_items");
		edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
	},

	qty(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_excl", (row.price || 0) * (row.qty || 0));
		frm.refresh_field("part_items");
		edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
	},

	part_items_add(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		set_row_color(frm, row, "");
		setTimeout(() => reapply_colors(frm), 100);
	},

	part_items_remove(frm) {
		edp_vehicles.pricing.recalc_totals(frm, WC_CONFIG);
		setTimeout(() => reapply_colors(frm), 100);
	},
});

function load_claim_warranty_plans(frm) {
	if (!frm.fields_dict.warranty_plan_view) return;
	if (!frm.doc.vin_serial_no) {
		frm.clear_table("warranty_plan_view");
		frm.refresh_field("warranty_plan_view");
		return;
	}
	frappe.db.get_list("Vehicle Linked Warranty Plan", {
		filters: { vin_serial_no: frm.doc.vin_serial_no },
		fields: ["name", "warranty_period_months", "warranty_limit_km_hours", "status"],
		order_by: "creation asc",
	}).then((plans) => {
		frm.clear_table("warranty_plan_view");
		(plans || []).forEach((p) => {
			frm.add_child("warranty_plan_view", {
				warranty_plan_description: p.name,
				period_months: p.warranty_period_months,
				warranty_odo_limit: p.warranty_limit_km_hours,
				status: p.status,
			});
		});
		frm.refresh_field("warranty_plan_view");
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
				} else if (gr.doc.part_no && !allowed_items.includes(gr.doc.part_no)) {
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
				frappe.model.set_value(row.doctype, row.name, "system_note", "Part Not Covered");
			} else {
				set_row_color(frm, row, "");
			}
		}
	});
}
