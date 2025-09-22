// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("HQ Part Order", {
	refresh(frm) {},

	before_save(frm) {
		let total_qty = 0;

		frm.doc.table_ugma.forEach((row) => {
			total_qty += row.qty || 0;
		});

		frm.set_value("total_qty_parts_ordered", total_qty);
		frm.set_value(
			"total_qty_parts_delivered",
			frm.doc.total_delivered_parts_qty || 0,
		);
		frm.set_value(
			"_order_delivered",
			((frm.doc.total_delivered_parts_qty || 0) /
				frm.doc.total_qty_parts_ordered) *
				100,
		);
	},
	total_excl(frm) {
		let total_excl = frm.doc.total_excl;
		let vat = 0.15 * total_excl;
		frm.set_value("vat", vat);
		frm.set_value("total_incl", vat + total_excl);
	},
});
