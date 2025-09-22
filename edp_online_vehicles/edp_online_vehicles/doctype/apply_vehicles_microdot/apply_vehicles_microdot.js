// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Apply Vehicles Microdot", {
	on_load: function (frm) {},
	refresh(frm) {
		frm.set_query("microdot", function () {
			return {
				filters: {
					status: "Received",
				},
			};
		});
		frm.set_query("vin_serial_no", function () {
			return {
				filters: {
					microdot: ["=", ""],
				},
			};
		});
	},
	before_save: function (frm) {
		if (!frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.apply_microdot.test_for_changes",
				args: {
					vinno: frm.doc.vin_serial_no,
					microdot: frm.doc.name,
					microdot_fitted_by: frm.doc.microdot_fitted_by,
					date_applied: frm.doc.date_applied,
				},
				callback: function (r) {},
			});
		}
	},
	after_save: function (frm) {
		frappe.call({
			method: "edp_online_vehicles.events.apply_microdot.apply_microdot",
			args: {
				vinno: frm.doc.vin_serial_no,
				microdot: frm.doc.name,
				microdot_fitted_by: frm.doc.microdot_fitted_by,
				date_applied: frm.doc.date_applied,
			},
			callback: function (r) {
				frappe.msgprint(__(r.message));
			},
		});
	},
	dealer(frm, cdt, cdn) {
		frappe.call({
			method: "edp_online_vehicles.events.set_filters.get_users",
			args: {
				dealer: frm.doc.dealer,
			},
			callback: function (r) {
				let users = r.message;
				frm.set_query("microdot_fitted_by", function () {
					return {
						filters: {
							email: ["in", users],
						},
					};
				});
			},
		});
	},
});
