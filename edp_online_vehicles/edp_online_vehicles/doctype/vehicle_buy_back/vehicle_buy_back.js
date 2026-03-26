frappe.ui.form.on("Vehicle Buy Back", {
	refresh(frm) {
		apply_form_defaults(frm);
		sync_seller_field_visibility(frm);

		setup_action_buttons(frm);
		
		// If the document is submitted
		if (frm.doc.docstatus === 1) { 
			frm.disable_save();
		} else {
			// Hide the submit button
			frm.disable_save();

			// Ensure the save button is still available
			frm.page.set_primary_action(__("Save"), () => {
				frm.save();
			});
		}

		// Ensure the save button is still available
		frm.page.set_primary_action(__("Save"), () => {
			frm.save();
		});
	},

	onload(frm) {
		apply_form_defaults(frm);
		sync_seller_field_visibility(frm);
	},

	before_save(frm) {
		remove_empty_vin_rows(frm);
		clear_seller_if_table_empty(frm);

		if (!frm.doc.buy_back_date_time) {
			frm.set_value("buy_back_date_time", frappe.datetime.now_datetime());
		}
		
		frm.set_value("vat", 15);
		calculate_totals(frm);
		
		if (frm.doc.offer_price_incl && frm.doc.offer_price_incl > 0) {
			calculate_offer_price_from_incl(frm);
		}

		// Auto-fill seller from VINs if not already set
		const vins_for_search = (frm.doc.table_vsmr || []).map(r => r.vin_serial_no).filter(v => v);
		const needs_seller_lookup = (
			(frm.doc.buy_from === "Customer" && !frm.doc.customer) ||
			(frm.doc.buy_from === "Dealer" && !frm.doc.dealer)
		);

		if (vins_for_search.length && needs_seller_lookup && !frm._seller_search_done) {
			frappe.validated = false;
			search_vins_and_set_seller(frm, vins_for_search, frm.doc.buy_from, function() {
				frm._seller_search_done = true;
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
			return;
		}

		if (frm.doc.buy_from === "Dealer" && frm.doc.dealer) {
			frm.set_value("dealer", null);
		}

		if (frm.doc.buy_from === "Dealer" && frm.doc.customer) {
			frm.set_value("customer", null);
		}

		sync_seller_field_visibility(frm);
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
	sync_seller_field_visibility(frm);
	if (!frm.doc.vat || frm.doc.vat == 0) {
		frm.set_value("vat", 15);
	}
}

function sync_seller_field_visibility(frm) {
	const is_buy_from_dealer = frm.doc.buy_from === "Dealer";
	frm.toggle_display("dealer", is_buy_from_dealer);
	frm.toggle_display("customer", !is_buy_from_dealer);
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
	const company_for_rules = frm.doc.purchasing_dealer || default_company;
	if (!company_for_rules) return;

	frappe.db.get_value("Company", company_for_rules, "custom_head_office").then((r) => {
		const is_head_office = !!(r && r.message && Number(r.message.custom_head_office) === 1);
		frm._is_head_office = is_head_office;

		frm.set_df_property("buy_from", "read_only", is_head_office ? 0 : 1);

		if (!is_head_office) {
			if (frm.is_new() && frm.doc.buy_from !== "Customer") {
				frm.set_value("buy_from", "Customer");
			}
		}

		sync_seller_field_visibility(frm);
		frm.refresh_field("buy_from");
		frm.refresh_field("dealer");
	});
}

frappe.ui.form.on("Vehicle Buy Back List", {
	async vin_serial_no(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const vin = (row.vin_serial_no || "").trim();
		if (!vin) {
			remove_row_by_name(frm, cdn);
			handle_table_change(frm);
			return;
		}

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
			// Buy from customer availablity status
			if (frm.doc.buy_from === "Customer"){
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
			}

			// Buy from dealer availablity status
			if (frm.doc.buy_from === "Dealer"){
				if (vehicle_status !== "available" && vehicle_status !== "reserved") {
					await reject_vin(
						frm,
						cdt,
						cdn,
						"VIN {0} cannot be added because its status is {1}. Only Available/Reserved vehicles are allowed.",
						[vin, vehicle.availability_status || __("Unknown")]
					);
					return;
				}
			}



			const vin_customer = vehicle.customer || null;
			if (frm.doc.buy_from === "Customer" && frm.doc.customer && vin_customer && frm.doc.customer !== vin_customer) {
				await reject_vin(
					frm,
					cdt,
					cdn,
					"VIN {0} belongs to customer {1}, but this Buy Back customer is {2}.",
					[vin, vin_customer, frm.doc.customer]
				);
				return;
			}

			if (frm.doc.buy_from === "Customer" && !frm.doc.customer && vin_customer) {
				await frm.set_value("customer", vin_customer);
				await frm.set_value("buy_from", "Customer");
			}

			const vin_dealer = vehicle.dealer || null;
			if (frm.doc.buy_from === "Dealer" && frm.doc.dealer && vin_dealer && frm.doc.dealer !== vin_dealer) {
				await reject_vin(
					frm,
					cdt,
					cdn,
					"VIN {0} belongs to dealer {1}, but this Buy Back dealer is {2}.",
					[vin, vin_dealer, frm.doc.dealer]
				);
				return;
			}
			
			if (frm.doc.buy_from === "Dealer" && !frm.doc.dealer && vin_dealer) {
				await frm.set_value("buy_from", "Dealer");
				await frm.set_value("dealer", vin_dealer);
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

function search_vins_and_set_seller(frm, vins, buy_from, callback) {
	frappe.call({
		method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_buy_back.vehicle_buy_back.search_vins",
		args: { vins: vins,
				buy_from: buy_from
		 	},
		callback: function(r) {
			if (r.exc || !r.message) {
				frappe.msgprint(__("Error looking up VINs."));
				if (callback) callback(null);
				return;
			}
			const result = r.message;

			// Only set customer if the buy back is from a customer.
			if (buy_from === "Customer") {

				if (result.status === "single") {
					frm.set_value("customer", result.customer);
					frm.set_value("buy_from", "Customer");
					frappe.show_alert({ message: __("Customer set to {0}", [result.customer]), indicator: "green" });

				} else if (result.status === "multiple") {
					frappe.msgprint(__("VINs belong to multiple customers: {0}.", [result.customers.join(", ")]));

				} else {
					frappe.msgprint(__("No customer found on any of the selected VINs."));
				}

				if (callback) callback(result);
			}

			// Only set dealer if the buy back is from a dealer.
			if (buy_from === "Dealer") {

				if (result.status === "single") {
					frm.set_value("buy_from", "Dealer");
					frm.set_value("dealer", result.dealer);
					frappe.show_alert({ message: __("Dealer set to {0}", [result.dealer]), indicator: "green" });

				} else if (result.status === "multiple") {
					frappe.msgprint(__("VINs belong to multiple dealers: {0}.", [result.dealers.join(", ")]));

				} else {
					frappe.msgprint(__("No dealer found on any of the selected VINs."));
				}

				if (callback) callback(result);
			}
		}
	});
}

function clear_seller_if_no_vins(frm) {
	const has_vins = (frm.doc.table_vsmr || []).some((r) => (r.vin_serial_no || "").trim());
	if (!has_vins) {
		clear_seller_if_table_empty(frm);
	}
}

function clear_seller_if_table_empty(frm) {
	if ((frm.doc.table_vsmr || []).length === 0) {
		if (frm.doc.buy_from === "Customer") {
			frm.set_value("customer", null);
		}
		if (frm.doc.buy_from === "Dealer") {
			frm.set_value("dealer", null);
		}
	}
}

function handle_table_change(frm) {
	frm._seller_search_done = false;
	remove_empty_vin_rows(frm);
	clear_seller_if_no_vins(frm);
	calculate_totals(frm);
	if (frm.doc.offer_price_incl && frm.doc.offer_price_incl > 0) {
		calculate_offer_price_from_incl(frm);
	}
}

function remove_empty_vin_rows(frm) {
	const rows = frm.doc.table_vsmr || [];
	let removed = false;

	for (let i = rows.length - 1; i >= 0; i--) {
		if (!((rows[i].vin_serial_no || "").trim())) {
			rows.splice(i, 1);
			removed = true;
		}
	}

	if (removed) {
		frm.refresh_field("table_vsmr");
	}

	return removed;
}

function remove_row_by_name(frm, row_name) {
	const rows = frm.doc.table_vsmr || [];
	const index = rows.findIndex((r) => r.name === row_name);
	if (index !== -1) {
		rows.splice(index, 1);
		frm.refresh_field("table_vsmr");
	}
}

async function reject_vin(frm, cdt, cdn, message, messageArgs) {
	frappe.msgprint(__(message, messageArgs));
	await frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
	clear_seller_if_no_vins(frm);
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
