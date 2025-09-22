// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles PDI Inspection", {
	onload(frm) {
		frm.set_query("Vehicles_inspection_template", () => {
			return {
				filters: {
					type: "PDI",
				},
			};
		});

		frm.doc.dealer = frappe.defaults.get_default("company");
	},
	Vehicles_inspection_template(frm, dt, dn) {
		if (frm.doc.Vehicles_inspection_template) {
			frm.doc.inspection_list = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.Vehicles_inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("inspection_list", {
							category: row.category,
							description: row.description,
						});
						frm.refresh_field("inspection_list");
					}
				});
		} else {
			frm.doc.inspection_list = [];
			frm.refresh_field("inspection_list");
		}
	},
});
