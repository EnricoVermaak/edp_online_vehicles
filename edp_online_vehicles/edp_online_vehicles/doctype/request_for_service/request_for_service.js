// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;

frappe.ui.form.on("Request for Service", {
	onload(frm, dt, dn) {
		frm.set_query("item", "labour", () => {
			return {
				filters: {
					item_group: "Service Labour",
				},
			};
		});

		// Reset the field to its previous status if no new value is selected
		$(document).on("blur", '[data-fieldname="rfs_status"]', function () {
			// Check if the value is empty (or remains unchanged)
			if (!frm.doc.rfs_status || frm.doc.rfs_status === "") {
				frm.set_value("rfs_status", previous_status_value);
			}
		});

		// $(document).on('click', '[data-fieldname="rfs_status"]', function() {
		//   frm.set_value('rfs_status', '');
		// });

		frm.set_query("item", "parts", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});
		frm.set_query("item", "extras", () => {
			return {
				filters: {
					item_group: "Other",
				},
			};
		});
		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");

			frappe.db
				.get_list("RFS Status", {
					filters: {
						is_default_status: 1,
					},
					fields: ["name"],
				})
				.then((rfs_status) => {
					if (rfs_status.length > 0) {
						frm.set_value("rfs_status", rfs_status[0].name);
					}
				});
		}
		previous_status_value = frm.doc.rfs_status;
	},
	parts_total_excl(frm, dt, dn) {
		let grand_total =
			frm.doc.parts_total_excl +
			frm.doc.labours_total_excl +
			frm.doc.extra_cost_total_excl;
		frappe.model.set_value(dt, dn, "total_vat_excl", grand_total);
	},
	labours_total_excl(frm, dt, dn) {
		let grand_total =
			frm.doc.parts_total_excl +
			frm.doc.labours_total_excl +
			frm.doc.extra_cost_total_excl;
		frappe.model.set_value(dt, dn, "total_vat_excl", grand_total);
	},
	extra_cost_total_excl(frm, dt, dn) {
		let grand_total =
			frm.doc.parts_total_excl +
			frm.doc.labours_total_excl +
			frm.doc.extra_cost_total_excl;
		frappe.model.set_value(dt, dn, "total_vat_excl", grand_total);
	},
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(
				__("Sales Order"),
				() => {
					if (!frm.doc.parts.length > 0) {
						frappe.throw(
							"No parts added to the parts table, please add parts to perform this action",
						);
					} else if (!frm.doc.part_schedule_date) {
						frappe.throw(
							"Please select a Scheduled Delivery Date under Parts Table",
						);
					} else {
						frappe.call({
							method: "edp_online_vehicles.events.create_sales_order.create_sales_order_rfs",
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
				__("Service"),
				() => {
					frappe.call({
						method: "edp_online_vehicles.events.create_service.rfs_create_service",
						args: {
							docname: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(r.message);
							}
						},
					});
				},
				__("Create"),
			);

			frm.add_custom_button(
				__("Material Request"),
				() => {
					if (!frm.doc.parts.length > 0) {
						frappe.throw(
							"No parts added to the parts table, please add parts to perform this action",
						);
					} else if (!frm.doc.part_schedule_date) {
						frappe.throw(
							"Please select a Scheduled Delivery Date under Parts Table",
						);
					} else {
						frappe.call({
							method: "edp_online_vehicles.events.create_material_request.create_material_request_rfs",
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
				"Internal Docs and Notes",
				() => {
					console.log(frm);

					frappe.model.open_mapped_doc({
						method: "edp_online_vehicles.edp_online_vehicles.doctype.request_for_service.request_for_service.create_internal_docs_notes",
						frm: frm,
					});
				},
				"Create",
			);
		}
	},
	after_save(frm) {
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.rfs_status_change",
			args: {
				vinno: frm.doc.vin_serial_no,
				status: frm.doc.rfs_status,
			},
			callback: function (r) {
				if (r.message) {
					frappe.msgprint(r.message);
				}
			},
		});

		// if(frm.doc.quote_preapproval_signature) {
		//   frappe.call({
		//     method: 'edp_online_vehicles.events.attach_signature.add_quotation_signatures_to_pdf',
		//     args: {
		//       docname: frm.doc.name
		//     },
		//     callback: function(r) {
		//       if (r.message) {
		//         frappe.show_alert({
		//           message: r.message
		//         }, 5);
		//       }
		//     }
		//   });
		// }

		// if(frm.doc.invoice_approval_signature) {
		//   frappe.call({
		//     method: 'edp_online_vehicles.events.attach_signature.add_invoice_signatures_to_pdf',
		//     args: {
		//       docname: frm.doc.name
		//     },
		//     callback: function(r) {
		//       if (r.message) {
		//         frappe.show_alert({
		//           message: r.message
		//         }, 5);
		//       }
		//     }
		//   });
		// }
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
							.get_list("Request for Service", {
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
});

frappe.ui.form.on("RFS Parts", {
	item(frm, cdt, cdn) {
		if (frm.doc.price_list) {
			get_price(frm, cdt, cdn);
		}
	},

	parts_remove(frm) {
		calculate_sub_total(frm, "parts_total_excl", "parts");
	},

	price_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	total_excl(frm) {
		calculate_sub_total(frm, "parts_total_excl", "parts");
	},
});

frappe.ui.form.on("RFS Labour", {
	item(frm, cdt, cdn) {
		if (frm.doc.price_list) {
			get_price(frm, cdt, cdn);
		}
	},
	labour_remove(frm) {
		calculate_sub_total(frm, "labours_total_excl", "labour");
	},

	rate_hour(frm, cdt, cdn) {
		calculate_labour_total(frm, cdt, cdn);
	},

	duration_hours(frm, cdt, cdn) {
		calculate_labour_total(frm, cdt, cdn);
	},

	total_excl(frm) {
		calculate_sub_total(frm, "labours_total_excl", "labour");
	},
});

frappe.ui.form.on("Extra Items", {
	price_per_item_excl(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_extra_total(frm, cdt, cdn);
	},
	extras_remove(frm) {
		calculate_sub_total(frm, "extra_cost_total_excl", "extras");
	},

	total_excl(frm) {
		calculate_sub_total(frm, "extra_cost_total_excl", "extras");
	},
});

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
			if (cdt == "RFS Parts") {
				frappe.model.set_value(cdt, cdn, "price_excl", price);
			}
			if (cdt == "RFS Labour") {
				frappe.model.set_value(cdt, cdn, "rate_hour", price);
			}
		},
	});
};

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.price_excl || !row.qty) return;

	let total = row.price_excl * row.qty;
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

const calculate_labour_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.rate_hour || !row.duration_hours) return;

	let total = row.rate_hour * row.duration_hours;
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

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
