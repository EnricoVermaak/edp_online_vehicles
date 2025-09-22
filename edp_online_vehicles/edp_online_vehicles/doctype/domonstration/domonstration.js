// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Domonstration", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on("Vehicles Order Item", {
	grid_row_open: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		console.log("Grid Row Code: ", row);
	},
	form_render: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		console.log("Form_render Code:", row);
	},
});
