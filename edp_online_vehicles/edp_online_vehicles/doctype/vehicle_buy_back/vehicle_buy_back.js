// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Buy Back", {
	onload(frm) {
		// Set buy_from options based on user role
		// Head Office (Vehicles Administrator) can buy from Dealer or Customer
		// Dealers (Dealer Vehicle Administrator) can only buy from Customer
		if (frappe.user.has_role("Vehicles Administrator")) {
			// Head Office - show both options
			frm.set_df_property("buy_from", "options", "\nDealer\nCustomer");
		} else {
			// Dealers - only show Customer option
			frm.set_df_property("buy_from", "options", "\nCustomer");
			// If current value is "Dealer", change it to "Customer"
			if (frm.doc.buy_from === "Dealer") {
				frm.set_value("buy_from", "Customer");
			}
		}
		
		// Set default VAT to 15%
		if (!frm.doc.vat) {
			frm.set_value("vat", 15);
		}
		
		// Initialize VIN field visibility based on checkbox
		toggle_vin_fields(frm);
		
		// Set VIN filter based on dealer if dealer is selected
		if (frm.doc.buy_from === "Dealer" && frm.doc.dealer) {
			set_vin_filter(frm);
		}
		
		// Set VIN filter based on customer if customer is selected
		if (frm.doc.buy_from === "Customer" && frm.doc.customer) {
			set_customer_vin_filter(frm);
		}
		
		// Set customer filter based on user role
		// Dealers should only see customers for their company
		// Head Office can see all customers
		set_customer_filter(frm);
		
		// Set colour filter if model is already selected and VIN not found
		if (frm.doc.vin_not_found && frm.doc.model) {
			set_colour_filter(frm);
		}
	},
	vin_not_found(frm) {
		// Toggle between link field and manual entry field
		toggle_vin_fields(frm);
		
		// Clear the other field when switching
		if (frm.doc.vin_not_found) {
			frm.set_value("vin_serial_no", "");
			// Set colour filter if model is selected
			if (frm.doc.model) {
				set_colour_filter(frm);
			}
		} else {
			frm.set_value("vin_serial_no_manual", "");
			// Remove colour filter when VIN is found (it will fetch from Vehicle Stock)
			frm.set_query("colour", () => {
				return {};
			});
		}
	},
	vin_serial_no(frm) {
		// When VIN is selected (link field), fetch pricing data from Model Administration
		// Model field is auto-populated from vin_serial_no, so wait a moment for it to populate
		if (!frm.doc.vin_not_found && frm.doc.vin_serial_no) {
			setTimeout(() => {
				if (frm.doc.model) {
					fetch_pricing_from_model(frm);
				}
			}, 100);
		}
	},
	model(frm) {
		// When model changes
		if (frm.doc.model) {
			if (frm.doc.vin_not_found) {
				// VIN not found - populate description and set colour filter
				populate_fields_for_unconfirmed_vin(frm);
			} else {
				// VIN found - fetch pricing data from Model Administration
				fetch_pricing_from_model(frm);
			}
		} else {
			// Clear pricing fields if model is cleared
			frm.set_value("cost_price_excl", "");
			frm.set_value("dealer_billing_excl", "");
			frm.set_value("suggested_retail_excl", "");
			if (frm.doc.vin_not_found) {
				frm.set_value("description", "");
			}
		}
	},
	buy_from(frm) {
		// When buy_from changes
		if (frm.doc.buy_from === "Dealer") {
			// If dealer is selected, set VIN filter
			if (frm.doc.dealer) {
				set_vin_filter(frm);
			}
			// Clear customer filter
			frm.set_query("vin_serial_no", () => {
				return {};
			});
		} else if (frm.doc.buy_from === "Customer") {
			// If customer is selected, set VIN filter to customer's linked VINs
			if (frm.doc.customer) {
				set_customer_vin_filter(frm);
			}
		}
	},
	dealer(frm) {
		// When dealer changes, update VIN filter
		if (frm.doc.buy_from === "Dealer" && frm.doc.dealer) {
			set_vin_filter(frm);
		} else {
			// Clear VIN filter if dealer is cleared
			frm.set_query("vin_serial_no", () => {
				return {};
			});
		}
	},
	customer(frm) {
		// When customer changes, filter VINs to only show customer's linked vehicles
		if (frm.doc.buy_from === "Customer" && frm.doc.customer) {
			set_customer_vin_filter(frm);
		} else {
			// Clear VIN filter if customer is cleared
			frm.set_query("vin_serial_no", () => {
				return {};
			});
		}
		// Update customer filter when customer field is accessed
		set_customer_filter(frm);
	},
	dealer(frm) {
		// When dealer changes, update VIN filter
		if (frm.doc.buy_from === "Dealer" && frm.doc.dealer) {
			set_vin_filter(frm);
		}
	},
	offer_price_excl(frm) {
		// Auto-calculate offer_price_incl when offer_price_excl changes
		calculate_offer_price_incl(frm);
	},
	vat(frm) {
		// Recalculate offer_price_incl when VAT changes
		calculate_offer_price_incl(frm);
	},
});

function toggle_vin_fields(frm) {
	// Show/hide VIN fields based on checkbox
	if (frm.doc.vin_not_found) {
		// Show manual entry field, hide link field
		frm.set_df_property("vin_serial_no", "hidden", 1);
		frm.set_df_property("vin_serial_no_manual", "hidden", 0);
		frm.set_df_property("vin_serial_no", "reqd", 0);
		frm.set_df_property("vin_serial_no_manual", "reqd", 1);
	} else {
		// Show link field, hide manual entry field
		frm.set_df_property("vin_serial_no", "hidden", 0);
		frm.set_df_property("vin_serial_no_manual", "hidden", 1);
		frm.set_df_property("vin_serial_no", "reqd", 1);
		frm.set_df_property("vin_serial_no_manual", "reqd", 0);
	}
	frm.refresh_field("vin_serial_no");
	frm.refresh_field("vin_serial_no_manual");
}

function set_vin_filter(frm) {
	// Set VIN filter based on selected dealer
	if (frm.doc.buy_from === "Dealer" && frm.doc.dealer) {
		frm.set_query("vin_serial_no", () => {
			return {
				filters: {
					dealer: frm.doc.dealer,
				},
			};
		});
	} else {
		// No filter if dealer not selected
		frm.set_query("vin_serial_no", () => {
			return {};
		});
	}
}

function set_customer_filter(frm) {
	// Set customer filter based on user role
	if (frm.doc.buy_from === "Customer") {
		frm.set_query("customer", () => {
			const user_company = frappe.defaults.get_default("company");
			
			// Head Office (Vehicles Administrator) can see all customers
			if (frappe.user.has_role("Vehicles Administrator")) {
				return {}; // No filter - show all customers
			} else {
				// Dealers (Dealer Vehicle Administrator) can only see customers for their company
				if (user_company) {
					return {
						filters: {
							company: user_company,
						},
					};
				} else {
					// If no company set, return empty filter (will show nothing)
					return {
						filters: {
							company: "", // This will show no results
						},
					};
				}
			}
		});
	}
}

function set_customer_vin_filter(frm) {
	// Set VIN filter to only show vehicles linked to the selected customer
	if (frm.doc.buy_from === "Customer" && frm.doc.customer) {
		// First, get all VINs linked to this customer from Dealer Customer
		frappe.db.get_doc("Dealer Customer", frm.doc.customer).then((customer_doc) => {
			// Extract VINs from the vehicles_linked_to_customer table
			const linked_vins = customer_doc.vehicles_linked_to_customer.map(row => row.vin_serial_no);
			
			if (linked_vins.length > 0) {
				// Filter VIN field to only show linked VINs
				frm.set_query("vin_serial_no", () => {
					return {
						filters: {
							name: ["in", linked_vins],
						},
					};
				});
			} else {
				// No linked vehicles - show message
				frappe.msgprint(__("No vehicles are currently linked to this customer."));
				frm.set_query("vin_serial_no", () => {
					return {
						filters: {
							name: ["in", []], // Empty filter - no VINs will show
						},
					};
				});
			}
		}).catch((error) => {
			console.error("Error fetching customer vehicles:", error);
			frm.set_query("vin_serial_no", () => {
				return {};
			});
		});
	}
}

function calculate_offer_price_incl(frm) {
	// Calculate offer_price_incl = offer_price_excl + VAT
	if (frm.doc.offer_price_excl && frm.doc.vat) {
		const vat_amount = (frm.doc.offer_price_excl * frm.doc.vat) / 100;
		const offer_price_incl = frm.doc.offer_price_excl + vat_amount;
		frm.set_value("offer_price_incl", offer_price_incl);
	} else if (frm.doc.offer_price_excl && !frm.doc.vat) {
		// If VAT is not set, use default 15%
		frm.set_value("vat", 15);
		const vat_amount = (frm.doc.offer_price_excl * 15) / 100;
		const offer_price_incl = frm.doc.offer_price_excl + vat_amount;
		frm.set_value("offer_price_incl", offer_price_incl);
	} else {
		frm.set_value("offer_price_incl", 0);
	}
}

function set_colour_filter(frm) {
	// Set colour filter based on selected model
	if (frm.doc.model) {
		frm.set_query("colour", () => {
			return {
				filters: {
					model: frm.doc.model,
					discontinued: 0  // Only show non-discontinued colours
				},
			};
		});
	}
}

function populate_fields_for_unconfirmed_vin(frm) {
	// Populate fields when model is selected for unconfirmed VIN
	if (!frm.doc.model) {
		return;
	}

	frappe.db.get_doc("Model Administration", frm.doc.model).then((model_doc) => {
		// Populate description from model
		if (model_doc.model_description) {
			frm.set_value("description", model_doc.model_description);
		}
		
		// Set colour filter based on model
		set_colour_filter(frm);
		
		// Also fetch pricing data
		frm.set_value("cost_price_excl", model_doc.cost_price_excl || 0);
		frm.set_value("dealer_billing_excl", model_doc.dealer_billing_excl || 0);
		frm.set_value("suggested_retail_excl", model_doc.suggested_retail_excl || 0);
	}).catch((error) => {
		console.error("Error fetching data from Model Administration:", error);
		frappe.msgprint(__("Error fetching data from Model Administration"));
	});
}

function fetch_pricing_from_model(frm) {
	// Fetch pricing data from Model Administration
	if (!frm.doc.model) {
		return;
	}

	frappe.db.get_doc("Model Administration", frm.doc.model).then((model_doc) => {
		// Update pricing fields from Model Administration
		frm.set_value("cost_price_excl", model_doc.cost_price_excl || 0);
		frm.set_value("dealer_billing_excl", model_doc.dealer_billing_excl || 0);
		frm.set_value("suggested_retail_excl", model_doc.suggested_retail_excl || 0);
	}).catch((error) => {
		console.error("Error fetching pricing from Model Administration:", error);
		frappe.msgprint(__("Error fetching pricing data from Model Administration"));
	});
}

