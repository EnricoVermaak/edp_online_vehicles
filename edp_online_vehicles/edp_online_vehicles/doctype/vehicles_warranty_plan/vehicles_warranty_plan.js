// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Warranty Plan", {
	refresh(frm) {},
	model: function (frm) {
		if (frm.doc.model) {
			frm.call("get_model_vehicles", { model: frm.doc.model }).then(
				(r) => {
					if (r.message) {
						frappe.dom.freeze();

						for (let row of r.message) {
							frm.add_child("vehicles", {
								vin_serial_no: row.name,
								model: row.model,
								colour: row.colour || "",
							});
						}

						frm.refresh_field("vehicles");
						frappe.dom.unfreeze();
					}
				},
			);
		}
	},
});
