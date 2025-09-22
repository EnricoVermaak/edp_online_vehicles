// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Inspection FSP", {
	inspection_template: function (frm) {
		let template = frm.doc.inspection_template;

		if (template) {
			frappe
				.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.doctype.inspection_fsp.inspection_fsp.inspection_template",
					args: { template: template },
				})
				.done((r) => {
					frm.doc.condition = [];

					$.each(r.message, function (_i, e) {
						let entry = frm.add_child("condition");
						entry.description = e.description;
					});

					refresh_field("condition");
				});
		}
	},
});
