// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Stolen Vehicles Register", {
	refresh(frm) {},
	after_save(frm) {
		frappe.call({
			method: "edp_online_vehicles.events.change_vehicles_status.stolen_vehicles_status_change",
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
