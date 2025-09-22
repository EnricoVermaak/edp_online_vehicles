// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Service Inspection", {
	onload(frm, dt, dn) {
		frm.set_query("inspection_template", () => {
			return {
				filters: {
					type: "Service Inspection",
				},
			};
		});
		frappe.model.set_value(dt, dn, "technician", frappe.session.user);
	},
	inspection_template(frm, dt, dn) {
		if (frm.doc.inspection_template) {
			frm.doc.inspection_items = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("inspection_items", {
							description: row.description,
						});
						frm.refresh_field("inspection_items");
					}
				});
		} else {
			frm.doc.inspection_items = [];
			frm.refresh_field("inspection_items");
		}
	},
});
