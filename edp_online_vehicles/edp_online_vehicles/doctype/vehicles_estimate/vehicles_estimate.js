// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Estimate", {
	refresh(frm) {},
});

frappe.ui.form.on("Vehicles Estimate Items", {
	price_excl(frm) {
		calculate_sub_total(frm, "total_item_price_excl", "vehicles_items");
	},
});

frappe.ui.form.on("Vehicles Estimate Extras", {
	price_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},
	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},
	extras_remove(frm) {
		calculate_exstra_sub_total(
			frm,
			"total_exstra_price_excl",
			"vehicles_extras",
		);
	},
	total_excl(frm) {
		calculate_exstra_sub_total(
			frm,
			"total_exstra_price_excl",
			"vehicles_extras",
		);
	},
});

frappe.ui.form.on("Vehicles Estimate TradeIn Items", {
	price_excl(frm) {
		calculate_sub_total(frm, "total_trade_in_price_excl", "trade_in_items");
	},
});

const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.price_excl;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.price_excl || !row.qty) return;

	let total = row.price_excl * row.qty;
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

const calculate_exstra_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.total_excl;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};
