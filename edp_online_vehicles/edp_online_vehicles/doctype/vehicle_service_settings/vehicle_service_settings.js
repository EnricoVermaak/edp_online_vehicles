// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let allow_additional_parts_any_service = false;

frappe.ui.form.on("Vehicle Service Settings", {
	allow_additional_parts_any_service(frm) {
		allow_additional_parts_any_service =
			frm.doc.allow_additional_parts_any_service;
	},
	after_save(frm) {
		if (
			allow_additional_parts_any_service === 0 ||
			allow_additional_parts_any_service === 1
		) {
			frappe.call({
				method: "edp_online_vehicles.events.update_services.update_services",
				args: {
					allow_additional_parts_any_service:
						allow_additional_parts_any_service,
				},
				callback: function (r) {},
			});
		}
	},
});
