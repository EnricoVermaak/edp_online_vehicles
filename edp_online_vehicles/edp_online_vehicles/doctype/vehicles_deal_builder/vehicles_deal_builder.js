// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let otp_items = [];

frappe.ui.form.on("Vehicles Deal Builder", {
	refresh(frm) {
		if (!frm.doc.sales_person) {
			if (frm.is_new()) {
				frm.set_value("sales_person", frappe.session.user);
			}
		}

		if (frm.doc.table_scfl.length == 0) {
			frm.call("get_otp_items").then((r) => {
				if (r.message) {
					let response = r.message;

					response.forEach((row) => {
						frm.add_child("table_scfl", {
							description: row.description,
						});

						frm.refresh_field("table_scfl");

						if (row.disable_delete_function == 1) {
							otp_items.push(row.description);
						}
					});
				}
			});
		}
	},

	total_suggested_retail_excl(frm) {
		if (frm.doc.total_suggested_retail_excl > 0) {
			frappe.call({
				method: "edp_online_vehicles.events.get_vat.get_vat",
				args: {
					company: frm.doc.dealer,
				},
				callback: function (r) {
					let vat =
						frm.doc.total_suggested_retail_excl * (r.message / 100);

					frm.set_value("stock_vehicle_total_vat", vat);
					frm.set_value(
						"stock_vehicle_total_incl",
						frm.doc.total_suggested_retail_excl + vat,
					);
				},
			});

			for (let row of frm.doc.table_scfl) {
				if (row.description == "Retail (Excl)") {
					frappe.model.set_value(
						row.doctype,
						row.name,
						"amount",
						frm.doc.total_suggested_retail_excl,
					);
				}
			}
		}
	},

	sub_total_excl(frm) {
		if (frm.doc.sub_total_excl > 0) {
			frappe.call({
				method: "edp_online_vehicles.events.get_vat.get_vat",
				args: {
					company: frm.doc.dealer,
				},
				callback: function (r) {
					let vat = frm.doc.sub_total_excl * (r.message / 100);

					frm.set_value("vat", vat);
					frm.set_value(
						"total_incl",
						frm.doc.sub_total_excl + vat - frm.doc.deposit,
					);
				},
			});
		}
	},

	total_deposit_excl(frm) {
		if (frm.doc.total_deposit_excl > 0) {
			frm.set_value("deposit", frm.doc.total_deposit_excl);
		}
	},

	sub_total(frm) {
		if (frm.doc.sub_total > 0) {
			frappe.call({
				method: "edp_online_vehicles.events.get_vat.get_vat",
				args: {
					company: frm.doc.dealer,
				},
				callback: function (r) {
					let vat = frm.doc.sub_total * (r.message / 100);

					frm.set_value("total_vat", vat);
					frm.set_value(
						"total_settlement_excl",
						frm.doc.sub_total + vat,
					);
				},
			});
		}
	},
});

frappe.ui.form.on("Vehicles Deal Builder Vehicle", {
	suggested_retail_excl(frm) {
		calculate_sub_total_vehicle(
			frm,
			"total_suggested_retail_excl",
			"stock_vehicles",
		);
	},
	stock_vehicles_remove(frm) {
		calculate_sub_total_vehicle(
			frm,
			"total_suggested_retail_excl",
			"stock_vehicles",
		);
	},
});

frappe.ui.form.on("Vehicles Deal Builder Tradein", {
	total_deposit(frm, cdt, cdn) {
		calculate_deposit_total(frm, "total_deposit_excl", "trade_in_vehicles");
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	tradein_price(frm, cdt, cdn) {
		calculate_tradein_total(
			frm,
			"total_trade_in_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	allowance_on_ti(frm, cdt, cdn) {
		calculate_allowance_on_ti_total(
			frm,
			"total_allowance_on_trade_in_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	customer_cash(frm, cdt, cdn) {
		calculate_customer_cash_total(
			frm,
			"total_customer_cash_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	stand_in_price(frm, cdt, cdn) {
		calculate_stand_in_price_total(
			frm,
			"total_stand_in_price_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	tradein_price_bank(frm, cdt, cdn) {
		calculate_tradein_price_bank_total(
			frm,
			"total_tradein_price_bank_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	settlement(frm, cdt, cdn) {
		calculate_settlement_total(
			frm,
			"total_extras_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	cash_back(frm, cdt, cdn) {
		calculate_cash_back_total(
			frm,
			"total_cash_back_excl",
			"trade_in_vehicles",
		);
		calculate_subtotal_tradein(frm, cdt, cdn);
	},
	subtotal(frm) {
		calculate_sub_total_tradein(frm, "sub_total", "trade_in_vehicles");
	},
	trade_in_vehicles_remove(frm) {
		calculate_deposit_total(frm, "total_deposit_excl", "trade_in_vehicles");
		calculate_tradein_total(
			frm,
			"total_trade_in_excl",
			"trade_in_vehicles",
		);
		calculate_allowance_on_ti_total(
			frm,
			"total_allowance_on_trade_in_excl",
			"trade_in_vehicles",
		);
		calculate_customer_cash_total(
			frm,
			"total_customer_cash_excl",
			"trade_in_vehicles",
		);
		calculate_stand_in_price_total(
			frm,
			"total_stand_in_price_excl",
			"trade_in_vehicles",
		);
		calculate_tradein_price_bank_total(
			frm,
			"total_tradein_price_bank_excl",
			"trade_in_vehicles",
		);
		calculate_settlement_total(
			frm,
			"total_extras_excl",
			"trade_in_vehicles",
		);
		calculate_cash_back_total(
			frm,
			"total_cash_back_excl",
			"trade_in_vehicles",
		);
	},
});

frappe.ui.form.on("Vehicle Deal Builder OTP Items", {
	total(frm) {
		calculate_sub_total_otp(frm, "sub_total_excl", "table_scfl");
	},
	table_scfl_remove(frm) {
		calculate_sub_total_otp(frm, "sub_total_excl", "table_scfl");
	},
	amount(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},
	qty(frm, cdt, cdn) {
		calculate_total(frm, cdt, cdn);
	},
	before_table_scfl_remove(frm, cdt, cdn) {
		const row = locals[cdt][cdn];

		// If this row's description is one of the protected otp_items, block deletion
		if (otp_items.includes(row.description)) {
			frappe.throw(
				__('Cannot delete an OTP item: "{0}"', [row.description]),
			);
		}
	},
});

const calculate_sub_total_otp = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.total) {
			sub_total += row.total;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_sub_total_tradein = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.subtotal) {
			sub_total += row.subtotal;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_deposit_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.total_deposit) {
			sub_total += row.total_deposit;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_tradein_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.tradein_price) {
			sub_total += row.tradein_price;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_allowance_on_ti_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.allowance_on_ti) {
			sub_total += row.allowance_on_ti;
		}
	}

	frm.set_value(field_name, sub_total);
};
const calculate_customer_cash_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.customer_cash) {
			sub_total += row.customer_cash;
		}
	}

	frm.set_value(field_name, sub_total);
};
const calculate_stand_in_price_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.stand_in_price) {
			sub_total += row.stand_in_price;
		}
	}

	frm.set_value(field_name, sub_total);
};
const calculate_tradein_price_bank_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.tradein_price_bank) {
			sub_total += row.tradein_price_bank;
		}
	}

	frm.set_value(field_name, sub_total);
};
const calculate_settlement_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.settlement) {
			sub_total += row.settlement;
		}
	}

	frm.set_value(field_name, sub_total);
};
const calculate_cash_back_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.cash_back) {
			sub_total += row.cash_back;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_sub_total_vehicle = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		if (row.suggested_retail_excl) {
			sub_total += row.suggested_retail_excl;
		}
	}

	frm.set_value(field_name, sub_total);
};

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.amount || !row.qty) return;

	let total = row.amount * row.qty;
	frappe.model.set_value(cdt, cdn, "total", total);
};

const calculate_subtotal_tradein = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (
		!row.total_deposit ||
		!row.tradein_price ||
		!row.allowance_on_ti ||
		!row.customer_cash ||
		!row.stand_in_price ||
		!row.tradein_price_bank ||
		!row.settlement ||
		!row.cash_back
	)
		return;

	let total =
		row.total_deposit +
		row.tradein_price +
		row.allowance_on_ti +
		row.customer_cash +
		row.stand_in_price +
		row.tradein_price_bank +
		row.settlement +
		row.cash_back;
	frappe.model.set_value(cdt, cdn, "subtotal", total);
};
