// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Location Movement", {
	refresh(frm) {
		// Limit prev_warehouse choices to the warehouse linked to the VIN (Serial No)
		if (frm.doc.vinserial_no) {
			frappe.db
				.get_value("Vehicle Stock", frm.doc.vinserial_no, "target_warehouse")
				.then((r) => {
					if (r.message && r.message.target_warehouse) {
						// Set query to filter warehouses
						frm.set_query("prev_warehouse", () => {
							return {
								filters: {
									name: r.message.target_warehouse,
								},
							};
						});
					}
				});
		}

		// Auto-fill prev_warehouse if we can resolve it from the Serial No
		if (frm.doc.vinserial_no && !frm.doc.prev_warehouse) {
			frappe.db
				.get_value("Vehicle Stock", frm.doc.vinserial_no, "target_warehouse")
				.then((r) => {
					if (r.message && r.message.target_warehouse) {
						frm.set_value("prev_warehouse", r.message.target_warehouse);
					}
				});
		}

		// Set query for move_to_warehouse to exclude group warehouses
		frm.set_query("move_to_warehouse", () => {
			return {
				filters: {
					is_group: 0,
				},
			};
		});
	},

	vinserial_no(frm) {
		// Keep it in sync if the VIN changes
		frm.set_value("prev_warehouse", null);
		if (frm.doc.vinserial_no) {
			frappe.db
				.get_value("Vehicle Stock", frm.doc.vinserial_no, "target_warehouse")
				.then((r) => {
					if (r.message && r.message.target_warehouse) {
						frm.set_value("prev_warehouse", r.message.target_warehouse);
					}
				});
		}
	},

	after_save(frm) {
		if (frm.status == "Approved" || frm.status == "Declined") {
			frappe.call({
				method: "edp_online_vehicles.events.submit_document.submit_location_movement_document",
				args: {
					doc: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							5,
						);
					}
				},
			});
		}
	},
});
