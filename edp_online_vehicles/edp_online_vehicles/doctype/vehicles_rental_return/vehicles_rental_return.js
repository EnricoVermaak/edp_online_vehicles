// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Rental Return", {
	onload(frm) {
		frm.set_query("inspection_template", () => {
			return {
				filters: {
					type: "Rental Return",
				},
			};
		});

		frm.doc.dealer = frappe.defaults.get_default("company");
	},
	inspection_template(frm, dt, dn) {
		if (frm.doc.inspection_template) {
			frm.doc.inspection = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("inspection", {
							category: row.category,
							description: row.description,
						});
						frm.refresh_field("inspection");
					}
				});
		} else {
			frm.doc.inspection_list = [];
			frm.refresh_field("inspection");
		}
	},
	after_save(frm) {
		if (frm.doc.received_by && frm.doc.date_received) {
			frappe.call({
				method: "edp_online_vehicles.events.change_vehicles_status.rental_return_status_change",
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
		}
	},
});
