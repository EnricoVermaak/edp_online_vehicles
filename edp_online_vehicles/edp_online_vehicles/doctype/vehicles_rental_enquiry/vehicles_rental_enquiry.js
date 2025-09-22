// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Rental Enquiry", {
	refresh(frm) {},
	onload: function (frm) {
		frm.doc.dealer = frappe.defaults.get_default("company");
	},
});
