// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Location Movement", {
	refresh(frm) {},
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
