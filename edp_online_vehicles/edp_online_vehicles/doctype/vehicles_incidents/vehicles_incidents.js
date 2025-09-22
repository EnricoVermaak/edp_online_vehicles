// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Incidents", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(
				"Request For Service",
				() => {
					frappe.call({
						method: "edp_online_vehicles.events.rfs_child_add.rfs_incedents",
						args: {
							docname: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(r.message);
							}
						},
					});
				},
				"Action",
			);
		}

		frm.set_query("item", "parts", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});
	},
	onload: function (frm) {
		frm.doc.dealer = frappe.defaults.get_default("company");
	},
});

frappe.ui.form.on("Service Parts Items", {
	item(frm, cdt, cdn) {
		if (frm.doc.price_list) {
			get_price(frm, cdt, cdn);
		}
	},

	service_parts_items_remove(frm, cdt, cdn) {
		calculate_sub_total(frm, "parts_total", "parts");
	},

	price_excl(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},

	total_excl(frm) {
		calculate_sub_total(frm, "parts_total", "parts");
	},
});

const get_price = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.item) return;

	frappe.call({
		method: "edp_online_vehicles.events.price_list.get_price",
		args: {
			price_list: frm.doc.price_list,
			item: row.item,
		},
		callback: (r) => {
			let price = r.message;
			if (cdt == "Service Parts Items") {
				frappe.model.set_value(cdt, cdn, "price_excl", price);
			}
			if (cdt == "Service Labour Items") {
				frappe.model.set_value(cdt, cdn, "rate_hour", price);
			}
		},
	});
};

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.price_excl || !row.qty) return;

	let total = row.price_excl * row.qty;
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

const calculate_sub_total = (frm, field_name, table_name) => {
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
