frappe.ui.form.on("Vehicle Buy Back", {
	refresh(frm) {
		apply_form_defaults(frm);

		setup_action_buttons(frm);
	},

	onload(frm) {
		apply_form_defaults(frm);
	},

	before_save(frm) {
		if (!frm.doc.buy_back_date_time) {
			frm.set_value("buy_back_date_time", frappe.datetime.now_datetime());
		}
		
		frm.set_value("vat", 15);
		calculate_totals(frm);
		
		if (frm.doc.offer_price_incl && frm.doc.offer_price_incl > 0) {
			calculate_offer_price_from_incl(frm);
		}

		// Auto-fill customer from VINs if not already set
		const vins_for_search = (frm.doc.table_vsmr || []).map(r => r.vin_serial_no).filter(v => v);
		if (vins_for_search.length && !frm.doc.customer && !frm._customer_search_done) {
			frappe.validated = false;
			search_vins_and_set_customer(frm, vins_for_search, function() {
				frm._customer_search_done = true;
				frappe.validated = true;
				frm.save();
			});
			return;
		}
	},

	table_vsmr(frm) {
		handle_table_change(frm);
	},

	table_vsmr_remove(frm) {
		handle_table_change(frm);
	},

	offer_price_incl(frm) {
		if (frm.doc.offer_price_incl) {
			calculate_offer_price_from_incl(frm);
		}
	},

	buy_from(frm) {
		if (frm._is_head_office === false && frm.doc.buy_from !== "Customer") {
			frm.set_value("buy_from", "Customer");
		}
		frm.refresh_field("table_vsmr");
	},

	dealer(frm) {
		if (frm.doc.buy_from === "Dealer") {
			frm.refresh_field("table_vsmr");
		}
	}
});

function apply_form_defaults(frm) {
	if (frm.is_new()) {
		frm.set_value("buy_back_date_time", frappe.datetime.now_datetime());
		if (!frm.doc.status) {
			frm.set_value("status", "Awaiting Seller Response");
		}
	}

	set_default_purchasing_dealer(frm);
	apply_buy_from_company_rules(frm);
	if (!frm.doc.vat || frm.doc.vat == 0) {
		frm.set_value("vat", 15);
	}
}

function set_default_purchasing_dealer(frm) {
	if (!frm.is_new() || frm.doc.purchasing_dealer) return;
	const default_company = frappe.defaults.get_default("company");
	if (default_company) {
		frm.set_value("purchasing_dealer", default_company);
	}
}

function apply_buy_from_company_rules(frm) {
	const default_company = frappe.defaults.get_default("company");
	if (!default_company) return;

	frappe.db.get_value("Company", default_company, "custom_head_office").then((r) => {
		const is_head_office = !!(r && r.message && Number(r.message.custom_head_office) === 1);
		frm._is_head_office = is_head_office;

		frm.set_df_property("buy_from", "read_only", is_head_office ? 0 : 1);

		if (!is_head_office) {
			if (frm.doc.buy_from !== "Customer") {
				frm.set_value("buy_from", "Customer");
			}
			if (frm.doc.dealer) {
				frm.set_value("dealer", null);
			}
		}

		frm.refresh_field("buy_from");
		frm.refresh_field("dealer");
	});
}

frappe.ui.form.on("Vehicle Buy Back List", {
	async vin_serial_no(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const vin = (row.vin_serial_no || "").trim();
		if (!vin) return;

		if (vin !== row.vin_serial_no) {
			await frappe.model.set_value(cdt, cdn, "vin_serial_no", vin);
		}

		const has_duplicate = (frm.doc.table_vsmr || []).some((r) =>
			r.name !== row.name && (r.vin_serial_no || "").trim() === vin
		);
		if (has_duplicate) {
			await reject_vin(frm, cdt, cdn, "VIN {0} is already added in this Buy Back.", [vin]);
			return;
		}

		try {
			const vehicle_resp = await frappe.call({
				method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_buy_back.vehicle_buy_back.get_vin_details",
				args: { vin: vin }
			});
			const vehicle = (vehicle_resp && vehicle_resp.message) || {};

			if (!vehicle.model) {
				await reject_vin(frm, cdt, cdn, "VIN {0} was not found in Vehicle Stock.", [vin]);
				return;
			}

			const vehicle_status = ((vehicle.availability_status || "") + "").trim().toLowerCase();
			if (vehicle_status !== "sold") {
				await reject_vin(
					frm,
					cdt,
					cdn,
					"VIN {0} cannot be added because its status is {1}. Only Sold vehicles are allowed.",
					[vin, vehicle.availability_status || __("Unknown")]
				);
				return;
			}

			const vin_customer = vehicle.customer || null;
			if (frm.doc.customer && vin_customer && frm.doc.customer !== vin_customer) {
				await reject_vin(
					frm,
					cdt,
					cdn,
					"VIN {0} belongs to customer {1}, but this Buy Back customer is {2}.",
					[vin, vin_customer, frm.doc.customer]
				);
				return;
			}

			if (!frm.doc.customer && vin_customer) {
				await frm.set_value("customer", vin_customer);
				await frm.set_value("buy_from", "Customer");
			}

			await set_row_values(cdt, cdn, {
				model: vehicle.model,
				description: vehicle.description,
				engine_no: vehicle.engine_no,
				exterior_colour: vehicle.colour,
				condition: vehicle.condition,
				availability_status: vehicle.availability_status,
				ho_invoice_no: vehicle.ho_invoice_no,
				ho_invoice_amt: vehicle.ho_invoice_amt,
				ho_invoice_date: vehicle.ho_invoice_date,
				cost_price_excl: vehicle.cost_price_excl,
				dealer_billing_excl: vehicle.dealer_billing_excl,
				suggested_retail_excl: vehicle.suggested_retail_excl,
			});

			if (cur_frm && cur_frm.doctype === "Vehicle Buy Back") {
				cur_frm.trigger("table_vsmr");
			}
		} catch (e) {
			frappe.msgprint(__("Could not fetch VIN details for {0}.", [vin]));
			console.error("Vehicle Buy Back VIN lookup failed", e);
		}
	}
});

function search_vins_and_set_customer(frm, vins, callback) {
	frappe.call({
		method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_buy_back.vehicle_buy_back.search_vins",
		args: { vins: vins },
		callback: function(r) {
			if (r.exc || !r.message) {
				frappe.msgprint(__("Error looking up VIN customers."));
				if (callback) callback(null);
				return;
			}
			const result = r.message;
			if (result.status === "single") {
				frm.set_value("customer", result.customer);
				frm.set_value("buy_from", "Customer");
				frappe.show_alert({ message: __("Customer set to {0}", [result.customer]), indicator: "green" });
			} else if (result.status === "multiple") {
				frappe.msgprint(__("VINs belong to multiple customers: {0}. Please set the customer manually.", [result.customers.join(", ")]));
			} else {
				frappe.msgprint(__("No customer found on any of the selected VINs."));
			}
			if (callback) callback(result);
		}
	});
}

function clear_customer_if_no_vins(frm) {
	const has_vins = (frm.doc.table_vsmr || []).some((r) => (r.vin_serial_no || "").trim());
	if (!has_vins && frm.doc.customer) {
		frm.set_value("customer", null);
	}
}

function handle_table_change(frm) {
	frm._customer_search_done = false;
	clear_customer_if_no_vins(frm);
	calculate_totals(frm);
	if (frm.doc.offer_price_incl && frm.doc.offer_price_incl > 0) {
		calculate_offer_price_from_incl(frm);
	}
}

async function reject_vin(frm, cdt, cdn, message, messageArgs) {
	frappe.msgprint(__(message, messageArgs));
	await frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
	clear_customer_if_no_vins(frm);
}

async function set_row_values(cdt, cdn, values) {
	for (const [fieldname, value] of Object.entries(values)) {
		if (value != null) {
			await frappe.model.set_value(cdt, cdn, fieldname, value);
		}
	}
}

function setup_action_buttons(frm) {
	const status = frm.doc.status;

	// Remove any existing custom buttons to avoid duplicates
	frm.remove_custom_button("Search Vins");
	frm.remove_custom_button("Seller Accepted");
	frm.remove_custom_button("Seller Declined");

	if (!frm.is_new()) {
		if (status === "Awaiting Seller Response") {
			frm.add_custom_button("Seller Accepted", function() {
				frappe.confirm(
					__("Are you sure you want to receive these vehicles in stock?"),
					function() {
						submit_with_seller_decision(frm, "accepted");
					}
				);
			}, "Actions");

			frm.add_custom_button("Seller Declined", function() {
				submit_with_seller_decision(frm, "declined");
			}, "Actions");
		}
	}

}

function submit_with_seller_decision(frm, decision) {
	if (frm.is_new()) {
		frm.save().then(() => {
			submit_with_seller_decision(frm, decision);
		});
		return;
	}

	frappe.call({
		method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_buy_back.vehicle_buy_back.submit_with_seller_decision",
		args: {
			docname: frm.doc.name,
			decision: decision
		},
		freeze: true,
		freeze_message: __("Submitting Vehicle Buy Back..."),
		callback: function(r) {
			if (r.exc || !r.message || !r.message.success) {
				frappe.msgprint((r.message && r.message.error) || __("Could not submit the seller decision."));
				return;
			}
			frappe.show_alert({ message: __("Vehicle Buy Back submitted successfully."), indicator: "green" });
			frm.reload_doc();
		}
	});
}

function calculate_totals(frm) {
	let total_cost_price = 0;
	let total_dealer_billing = 0;
	let total_suggested_retail = 0;
	let total_offer_price = 0;

	if (frm.doc.table_vsmr && frm.doc.table_vsmr.length > 0) {
		frm.doc.table_vsmr.forEach(function(row) {
			total_cost_price += parseFloat(row.cost_price_excl || 0);
			total_dealer_billing += parseFloat(row.dealer_billing_excl || 0);
			total_suggested_retail += parseFloat(row.suggested_retail_excl || 0);
			total_offer_price += parseFloat(row.offer_price_excl || 0);
		});
	}

	frm.set_value("cost_price_excl", total_cost_price);
	frm.set_value("dealer_billing_excl", total_dealer_billing);
	frm.set_value("suggested_retail_excl", total_suggested_retail);
	
	if (!frm.doc.offer_price_incl || frm.doc.offer_price_incl == 0) {
		frm.set_value("offer_price_excl", total_offer_price);
		calculate_offer_price(frm);
	}
}

function calculate_offer_price(frm) {
	let offer_excl = parseFloat(frm.doc.offer_price_excl || 0);
	let vat_percent = parseFloat(frm.doc.vat || 15);
	let vat_amount = (offer_excl * vat_percent) / 100;
	let offer_incl = offer_excl + vat_amount;
	
	frm.set_value("offer_price_incl", offer_incl);
}

function calculate_offer_price_from_incl(frm) {
	let offer_incl = parseFloat(frm.doc.offer_price_incl || 0);
	let vat_percent = parseFloat(frm.doc.vat || 15);
	let offer_excl = offer_incl / (1 + (vat_percent / 100));
	
	frm.set_value("offer_price_excl", offer_excl);
}
