// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let active = null;

frappe.ui.form.on("Vehicle Sale Status", {
	refresh(frm) {
		active = frm.doc.active;
	},
	after_save: function (frm) {
		if (frm.doc.default === 1) {
			frappe.call({
				method: "edp_online_vehicles.events.vehicle_sale_status.change_default",
				args: {
					doc_name: frm.doc.name,
					parent_doctype: "Vehicle Sale Status",
				},
				callback: function (r) {},
			});
		}
		if (frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.change_vehicles_status.add_status_to_settings",
				args: {
					docname: frm.doc.name,
					table_name: "vehicle_sale_status_order",
				},
				callback: function (r) {},
			});
		} else if (active !== frm.doc.active) {
			if (frm.doc.active === 1) {
				frappe.call({
					method: "edp_online_vehicles.events.change_vehicles_status.add_status_to_settings",
					args: {
						docname: frm.doc.name,
						table_name: "vehicle_sale_status_order",
					},
					callback: function (r) {},
				});
			} else {
				frappe.call({
					method: "edp_online_vehicles.events.change_vehicles_status.remove_status_from_settings",
					args: {
						docname: frm.doc.name,
						table_name: "vehicle_sale_status_order",
					},
					callback: function (r) {},
				});
			}
		}
	},
});
