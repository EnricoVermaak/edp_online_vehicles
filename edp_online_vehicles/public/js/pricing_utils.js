/**
 * Shared pricing utilities for parts, labour, extras, and totals.
 *
 * Used by: Vehicles Service, Vehicle Service Booking, Service Schedules, Vehicles Warranty Claims.
 *
 * Each caller passes a "config" object that maps generic concepts to the actual
 * field names on that particular doctype.  This means the logic lives in ONE place
 * and field-name differences between doctypes are just config.
 *
 * ── Config shape ──
 *
 *   {
 *     // Parts tables (array — can be 1 or 2 tables)
 *     parts: [
 *       {
 *         table:       "service_parts_items",   // fieldname of child table
 *         childtype:   "Service Parts Items",   // child DocType name
 *         item_field:  "item",                  // Link field for the item
 *         price_field: "price_excl",            // unit price field
 *         qty_field:   "qty",                   // quantity field
 *         total_field: "total_excl",            // row total field
 *         gp_field:    "custom_service_gp",     // GP% field on Item (null = no GP)
 *         gp_row_field: null,                   // field on child row to store GP% (optional)
 *         apply_gp:    true,                    // whether to apply GP on item select
 *       },
 *     ],
 *
 *     // Labour tables (array — can be 1 or 2 tables)
 *     labour: [
 *       {
 *         table:          "service_labour_items",
 *         childtype:      "Service Labour Items",
 *         item_field:     "item",
 *         rate_field:     "rate_hour",
 *         duration_field: "duration_hours",
 *         total_field:    "total_excl",
 *         gp_field:       "custom_service_gp",
 *         apply_gp:       true,
 *       },
 *     ],
 *
 *     // Extras table (optional)
 *     extras: {
 *       table:       "transaction_list",
 *       item_field:  "item_no",
 *       price_field: "price_per_item_excl",
 *       qty_field:   "qty",
 *       total_field: "total_excl",
 *     },
 *
 *     // Total fields on the parent doc
 *     totals: {
 *       parts:     "parts_total_excl",
 *       labour:    "labours_total_excl",
 *       extras:    "extra_cost_total_excl",
 *       duration:  "duration_total",
 *       qty:       "total_items",
 *       // Summary fields (optional — only Vehicles Service & Warranty)
 *       summary_parts:  "summary_parts_total",
 *       summary_labour: "summary_labour_total",
 *       summary_extras: "summary_extras_total",
 *       summary_total:  "summary_total_excl",
 *     },
 *
 *     // Company field that holds the labour rate
 *     labour_rate_field: "custom_service_labour_rate",
 *
 *     // Where to read the company from: "dealer" or "user_default"
 *     company_source: "dealer",  // frm.doc.dealer  |  frappe.defaults.get_user_default("Company")
 *   }
 */

frappe.provide("edp_vehicles.pricing");

// ─────────────────────────────────────────────
// 1.  PART PRICE  (Standard Selling + GP%)
// ─────────────────────────────────────────────

edp_vehicles.pricing.set_part_price = function (frm, cdt, cdn, cfg) {
	let row = locals[cdt][cdn];
	let item_code = row[cfg.item_field];
	if (!item_code) return Promise.resolve();

	return frappe.db.get_value(
		"Item Price",
		{ item_code: item_code, price_list: "Standard Selling" },
		"price_list_rate"
	).then(price_res => {
		let standard_rate = flt((price_res && price_res.message && price_res.message.price_list_rate) || 0);

		if (!cfg.apply_gp || !cfg.gp_field) {
			frappe.model.set_value(cdt, cdn, cfg.price_field, standard_rate);
			frappe.model.set_value(cdt, cdn, cfg.total_field, standard_rate * flt(row[cfg.qty_field] || 0));
			return;
		}

		return frappe.db.get_value("Item", item_code, cfg.gp_field).then(gp_res => {
			let gp_pct = flt((gp_res && gp_res.message && gp_res.message[cfg.gp_field]) || 0);
			let price = standard_rate + (standard_rate * gp_pct / 100);
			let total = price * flt(row[cfg.qty_field] || 0);
			frappe.model.set_value(cdt, cdn, cfg.price_field, price);
			frappe.model.set_value(cdt, cdn, cfg.total_field, total);
			if (cfg.gp_row_field) {
				frappe.model.set_value(cdt, cdn, cfg.gp_row_field, gp_pct);
			}
		});
	});
};

// ─────────────────────────────────────────────
// 2.  PART ROW TOTAL  (price × qty)
// ─────────────────────────────────────────────

edp_vehicles.pricing.calc_part_row_total = function (cdt, cdn, cfg) {
	let row = locals[cdt][cdn];
	let total = flt(row[cfg.price_field] || 0) * flt(row[cfg.qty_field] || 0);
	frappe.model.set_value(cdt, cdn, cfg.total_field, total);
};

// ─────────────────────────────────────────────
// 3.  LABOUR RATE  (Company rate + GP%)
// ─────────────────────────────────────────────

edp_vehicles.pricing.set_labour_rate = function (frm, cdt, cdn, cfg, overallCfg) {
	let row = locals[cdt][cdn];
	let item_code = row[cfg.item_field];
	if (!item_code) return Promise.resolve();

	let company = _get_company(frm, overallCfg);
	if (!company) return Promise.resolve();

	return frappe.db.get_value("Company", company, overallCfg.labour_rate_field).then(comp_res => {
		let base_rate = flt((comp_res && comp_res.message && comp_res.message[overallCfg.labour_rate_field]) || 0);

		if (!cfg.apply_gp || !cfg.gp_field) {
			frappe.model.set_value(cdt, cdn, cfg.rate_field, base_rate);
			frappe.model.set_value(cdt, cdn, cfg.total_field, base_rate * flt(row[cfg.duration_field] || 0));
			return;
		}

		return frappe.db.get_value("Item", item_code, cfg.gp_field).then(gp_res => {
			let gp_pct = flt((gp_res && gp_res.message && gp_res.message[cfg.gp_field]) || 0);
			let rate = base_rate + (base_rate * gp_pct / 100);
			frappe.model.set_value(cdt, cdn, cfg.rate_field, rate);
			frappe.model.set_value(cdt, cdn, cfg.total_field, rate * flt(row[cfg.duration_field] || 0));
		});
	});
};

// ─────────────────────────────────────────────
// 4.  LABOUR ROW TOTAL  (rate × duration)
// ─────────────────────────────────────────────

edp_vehicles.pricing.calc_labour_row_total = function (cdt, cdn, cfg) {
	let row = locals[cdt][cdn];
	let total = flt(row[cfg.rate_field] || 0) * flt(row[cfg.duration_field] || 0);
	frappe.model.set_value(cdt, cdn, cfg.total_field, total);
};

// ─────────────────────────────────────────────
// 5.  EXTRAS ROW TOTAL  (price × qty)
// ─────────────────────────────────────────────

edp_vehicles.pricing.calc_extra_row_total = function (cdt, cdn, cfg) {
	let row = locals[cdt][cdn];
	let total = flt(row[cfg.price_field] || 0) * flt(row[cfg.qty_field] || 0);
	frappe.model.set_value(cdt, cdn, cfg.total_field, total);
};

// ─────────────────────────────────────────────
// 6.  EXTRAS PRICE FROM ITEM  (Standard Selling, no GP)
// ─────────────────────────────────────────────

edp_vehicles.pricing.set_extra_price = function (frm, cdt, cdn, cfg) {
	let row = locals[cdt][cdn];
	let item_code = row[cfg.item_field];
	if (!item_code) return Promise.resolve();

	return frappe.db.get_value(
		"Item Price",
		{ item_code: item_code, price_list: "Standard Selling" },
		"price_list_rate"
	).then(price_res => {
		let rate = flt((price_res && price_res.message && price_res.message.price_list_rate) || 0);
		frappe.model.set_value(cdt, cdn, cfg.price_field, rate);
		frappe.model.set_value(cdt, cdn, cfg.total_field, rate * flt(row[cfg.qty_field] || 0));
	});
};

// ─────────────────────────────────────────────
// 7.  RECALCULATE ALL TOTALS ON PARENT
// ─────────────────────────────────────────────

edp_vehicles.pricing.recalc_totals = function (frm, config) {
	let t = config.totals;

	// Parts total
	if (t.parts) {
		let parts_sum = 0;
		let qty_sum = 0;
		for (let pcfg of config.parts || []) {
			for (let row of frm.doc[pcfg.table] || []) {
				parts_sum += flt(row[pcfg.total_field] || 0);
				if (pcfg.qty_field) qty_sum += flt(row[pcfg.qty_field] || 0);
			}
		}
		frm.doc[t.parts] = parts_sum;
		if (t.qty) frm.doc[t.qty] = qty_sum;
	}

	// Labour total + duration
	if (t.labour) {
		let labour_sum = 0;
		let dur_sum = 0;
		for (let lcfg of config.labour || []) {
			for (let row of frm.doc[lcfg.table] || []) {
				labour_sum += flt(row[lcfg.total_field] || 0);
				dur_sum += flt(row[lcfg.duration_field] || 0);
			}
		}
		frm.doc[t.labour] = labour_sum;
		if (t.duration) frm.doc[t.duration] = dur_sum;
	}

	// Extras total
	if (t.extras && config.extras) {
		let extras_sum = 0;
		for (let row of frm.doc[config.extras.table] || []) {
			extras_sum += flt(row[config.extras.total_field] || 0);
		}
		frm.doc[t.extras] = extras_sum;
	}

	// Summary / grand total
	if (t.summary_total) {
		let parts_val = flt(frm.doc[t.parts] || 0);
		let labour_val = flt(frm.doc[t.labour] || 0);
		let extras_val = t.extras ? flt(frm.doc[t.extras] || 0) : 0;
		if (t.summary_parts)  frm.doc[t.summary_parts]  = parts_val;
		if (t.summary_labour) frm.doc[t.summary_labour] = labour_val;
		if (t.summary_extras) frm.doc[t.summary_extras] = extras_val;
		frm.doc[t.summary_total] = parts_val + labour_val + extras_val;
	}

	frm.dirty();
	_refresh_total_fields(frm, config);
};

// ─────────────────────────────────────────────
// 8.  LOAD SCHEDULE INTO PARTS + LABOUR
// ─────────────────────────────────────────────

edp_vehicles.pricing.load_schedule = async function (frm, schedule_name, config) {
	if (!schedule_name) return;

	let schedule;
	try {
		schedule = await frappe.db.get_doc("Service Schedules", schedule_name);
	} catch (e) {
		console.error("load_schedule: could not fetch", schedule_name, e);
		return;
	}
	if (!schedule) return;

	// Clear existing rows (same as Vehicle Service)
	for (let pcfg of config.parts || []) {
		frm.clear_table(pcfg.table);
	}
	for (let lcfg of config.labour || []) {
		frm.clear_table(lcfg.table);
	}

	// Load parts from schedule — use frappe.model.add_child so it works on both Vehicles Service and Vehicle Service Booking
	let parts_cfg = (config.parts || [])[0];
	if (parts_cfg && schedule.service_parts_items && schedule.service_parts_items.length) {
		for (let part of schedule.service_parts_items) {
			let row = frappe.model.add_child(frm.doc, parts_cfg.childtype, parts_cfg.table);
			row[parts_cfg.item_field] = part.item;
			row.description = part.description || "";
			row[parts_cfg.qty_field] = flt(part.qty || 1);
			row[parts_cfg.price_field] = flt(part.price_excl || 0);
			row[parts_cfg.total_field] = flt(part.total_excl || 0);
		}
	}

	// Load labour from schedule with company rate + GP
	let labour_cfg = (config.labour || [])[0];
	if (labour_cfg && schedule.service_labour_items && schedule.service_labour_items.length) {
		let company = _get_company(frm, config);
		let base_rate = 0;
		if (company) {
			let comp_res = await frappe.db.get_value("Company", company, config.labour_rate_field);
			base_rate = flt((comp_res && comp_res.message && comp_res.message[config.labour_rate_field]) || 0);
		}

		for (let labour of schedule.service_labour_items) {
			let row = frappe.model.add_child(frm.doc, labour_cfg.childtype, labour_cfg.table);
			row[labour_cfg.item_field] = labour.item;
			row.description = labour.description || "";
			row[labour_cfg.duration_field] = flt(labour.duration_hours || 1);

			let rate = base_rate;
			if (labour.item && labour_cfg.apply_gp && labour_cfg.gp_field) {
				try {
					let gp_res = await frappe.db.get_value("Item", labour.item, labour_cfg.gp_field);
					let gp_pct = flt((gp_res && gp_res.message && gp_res.message[labour_cfg.gp_field]) || 0);
					rate = base_rate + (base_rate * gp_pct / 100);
				} catch (e) { /* use base rate on error */ }
			}
			row[labour_cfg.rate_field] = rate;
			row[labour_cfg.total_field] = rate * flt(row[labour_cfg.duration_field] || 0);
		}
	}

	// Refresh UI
	for (let pcfg of config.parts || []) {
		frm.refresh_field(pcfg.table);
	}
	for (let lcfg of config.labour || []) {
		frm.refresh_field(lcfg.table);
	}

	edp_vehicles.pricing.recalc_totals(frm, config);
};

// ─────────────────────────────────────────────
// 9.  WIRE UP CHILD TABLE EVENTS
//     Call once from the parent doctype's JS
// ─────────────────────────────────────────────

edp_vehicles.pricing.bind_child_events = function (config) {

	// --- Parts tables ---
	for (let pcfg of config.parts || []) {
		let events = {};

		events[pcfg.item_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.set_part_price(frm, cdt, cdn, pcfg).then(() => {
				edp_vehicles.pricing.recalc_totals(frm, config);
				frm.refresh_field(pcfg.table);
			});
		};

		events[pcfg.qty_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_part_row_total(cdt, cdn, pcfg);
			edp_vehicles.pricing.recalc_totals(frm, config);
			frm.refresh_field(pcfg.table);
		};

		events[pcfg.price_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_part_row_total(cdt, cdn, pcfg);
			edp_vehicles.pricing.recalc_totals(frm, config);
			frm.refresh_field(pcfg.table);
		};

		events[pcfg.total_field] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		events[pcfg.table + "_remove"] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		frappe.ui.form.on(pcfg.childtype, events);
	}

	// --- Labour tables ---
	for (let lcfg of config.labour || []) {
		let events = {};

		events[lcfg.item_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.set_labour_rate(frm, cdt, cdn, lcfg, config).then(() => {
				edp_vehicles.pricing.recalc_totals(frm, config);
				frm.refresh_field(lcfg.table);
			});
		};

		events[lcfg.duration_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_labour_row_total(cdt, cdn, lcfg);
			edp_vehicles.pricing.recalc_totals(frm, config);
			frm.refresh_field(lcfg.table);
		};

		events[lcfg.rate_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_labour_row_total(cdt, cdn, lcfg);
			edp_vehicles.pricing.recalc_totals(frm, config);
			frm.refresh_field(lcfg.table);
		};

		events[lcfg.total_field] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		events[lcfg.table + "_remove"] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		frappe.ui.form.on(lcfg.childtype, events);
	}

	// --- Extras table ---
	if (config.extras) {
		let ecfg = config.extras;
		let events = {};

		events[ecfg.item_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.set_extra_price(frm, cdt, cdn, ecfg).then(() => {
				edp_vehicles.pricing.recalc_totals(frm, config);
				frm.refresh_field(ecfg.table);
			});
		};

		events[ecfg.qty_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_extra_row_total(cdt, cdn, ecfg);
			edp_vehicles.pricing.recalc_totals(frm, config);

		};

		events[ecfg.price_field] = function (frm, cdt, cdn) {
			edp_vehicles.pricing.calc_extra_row_total(cdt, cdn, ecfg);
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		events[ecfg.total_field] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		events[ecfg.table + "_remove"] = function (frm) {
			edp_vehicles.pricing.recalc_totals(frm, config);
		};

		frappe.ui.form.on(ecfg.childtype, events);
	}
};

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

function _get_company(frm, config) {
	if (config.company_source === "user_default") {
		return frappe.defaults.get_user_default("Company");
	}
	return frm.doc.dealer || frappe.defaults.get_user_default("Company");
}

function _refresh_total_fields(frm, config) {
	let t = config.totals;
	let fields = [t.parts, t.labour, t.extras, t.duration, t.qty,
		t.summary_parts, t.summary_labour, t.summary_extras, t.summary_total];
	for (let f of fields) {
		if (f) {
			try { frm.refresh_field(f); } catch (e) { /* field may not exist */ }
		}
	}
}
