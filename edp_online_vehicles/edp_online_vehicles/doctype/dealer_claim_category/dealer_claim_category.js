// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Dealer Claim Category", {
// 	refresh(frm) {

// });

frappe.ui.form.on("Dealer Claim Type List", {
	vin_serial_no_mandatory(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.vin_serial_no_mandatory) {
			if (row.parts_mandatory) {
				frappe.model.set_value(cdt, cdn, "vin_serial_no_mandatory", 0);

				frappe.msgprint(
					"For a claim type, you may not designate both mandatory parts and mandatory VIN/Serial numbers.",
				);
			}
		}
	},

	parts_mandatory(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.parts_mandatory) {
			if (row.vin_serial_no_mandatory) {
				frappe.model.set_value(cdt, cdn, "parts_mandatory", 0);

				frappe.msgprint(
					"For a claim type, you may not designate both mandatory parts and mandatory VIN/Serial numbers.",
				);
			}
		}
	},
});
