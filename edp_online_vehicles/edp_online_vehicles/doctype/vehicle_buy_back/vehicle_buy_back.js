frappe.ui.form.on("Vehicle Buy Back", {
	refresh(frm) {
		if (frm.is_new()) {
			frm.set_value("buy_back_date_time", frappe.datetime.now_datetime());
		}
		if (!frm.doc.vat || frm.doc.vat == 0) {
			frm.set_value("vat", 15);
		}
	},

	onload(frm) {
		if (frm.is_new()) {
			frm.set_value("buy_back_date_time", frappe.datetime.now_datetime());
		}
		if (!frm.doc.vat || frm.doc.vat == 0) {
			frm.set_value("vat", 15);
		}
	},

	status(frm) {
		if (frm.doc.status === "Completed") {
			frm._needs_confirmation = true;
		}
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
		
		if (frm._needs_confirmation && frm.doc.status === "Completed") {
			frappe.validated = false;
			
			frappe.confirm(
				__("Are you sure you want to receive these vehicles in stock?"),
				function() {
					frm._needs_confirmation = false;
					frappe.validated = true;
					frm.save().then(() => {
						transfer_vehicles_to_dealer(frm);
					});
				},
				function() {
					frm.set_value("status", "Pending");
					frm._needs_confirmation = false;
					frappe.validated = true;
					frm.save();
				}
			);
			return;
		}
	},

	table_vsmr(frm) {
		calculate_totals(frm);
		if (frm.doc.offer_price_incl && frm.doc.offer_price_incl > 0) {
			calculate_offer_price_from_incl(frm);
		}
	},

	offer_price_incl(frm) {
		if (frm.doc.offer_price_incl) {
			calculate_offer_price_from_incl(frm);
		}
	}
});

frappe.ui.form.on("Vehicle Buy Back List", {
	vin_serial_no(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		
		if (row.vin_serial_no) {
			frappe.db.get_value("Vehicle Stock", row.vin_serial_no, ["model", "ho_invoice_no", "ho_invoice_amt", "ho_invoice_date"])
				.then((vehicle_data) => {
					if (vehicle_data.message && vehicle_data.message.model) {
						let model = vehicle_data.message.model;
						
						frappe.db.get_value("Model Administration", model, [
							"cost_price_excl",
							"dealer_billing_excl",
							"suggested_retail_excl"
						])
						.then((model_data) => {
							if (model_data.message) {
								frappe.model.set_value(cdt, cdn, "cost_price_excl", model_data.message.cost_price_excl || 0);
								frappe.model.set_value(cdt, cdn, "dealer_billing_excl", model_data.message.dealer_billing_excl || 0);
								frappe.model.set_value(cdt, cdn, "suggested_retail_excl", model_data.message.suggested_retail_excl || 0);
							}
							
							if (vehicle_data.message.ho_invoice_no) {
								frappe.model.set_value(cdt, cdn, "ho_invoice_no", vehicle_data.message.ho_invoice_no);
							}
							if (vehicle_data.message.ho_invoice_amt) {
								frappe.model.set_value(cdt, cdn, "ho_invoice_amt", vehicle_data.message.ho_invoice_amt);
							}
							if (vehicle_data.message.ho_invoice_date) {
								frappe.model.set_value(cdt, cdn, "ho_invoice_date", vehicle_data.message.ho_invoice_date);
							}
							
							if (cur_frm && cur_frm.doctype === "Vehicle Buy Back") {
								cur_frm.trigger("table_vsmr");
							}
						});
					}
				});
		}
	}
});

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

function transfer_vehicles_to_dealer(frm) {
	if (!frm.doc.purchasing_dealer || !frm.doc.table_vsmr || frm.doc.table_vsmr.length === 0) {
		frappe.msgprint(__("Please select a purchasing dealer and add vehicles to the table."));
		return;
	}

	frappe.call({
		method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_buy_back.vehicle_buy_back.transfer_vehicles_to_dealer",
		args: {
			docname: frm.doc.name,
			purchasing_dealer: frm.doc.purchasing_dealer
		},
		callback: function(r) {
			if (r.exc) {
				frappe.msgprint(__("An error occurred during transfer. Please check the error log for details."));
				return;
			}
			
			if (r.message && r.message.success) {
				let message_lines = [];
				
				if (r.message.transferred && r.message.transferred.length > 0) {
					message_lines.push(`<div style="margin-bottom: 10px;"><b>Successfully transferred ${r.message.transferred.length} vehicle(s) to ${frm.doc.purchasing_dealer}:</b></div>`);
					r.message.transferred.forEach(function(vin) {
						message_lines.push(`<div>✓ ${vin}</div>`);
					});
				}
				
				if (r.message.failed && r.message.failed.length > 0) {
					message_lines.push(`<div style="margin-top: 15px; margin-bottom: 10px;"><b style="color: orange;">⚠️ Failed to transfer ${r.message.failed.length} vehicle(s):</b></div>`);
					r.message.failed.forEach(function(fail) {
						message_lines.push(`<div>✗ ${fail.vin}: ${fail.error}</div>`);
					});
				}
				
				let d = new frappe.ui.Dialog({
					title: __("Transfer Complete"),
					indicator: r.message.failed && r.message.failed.length > 0 ? "orange" : "green",
					fields: [{
						fieldtype: "HTML",
						fieldname: "message_html",
						options: message_lines.join("")
					}],
					primary_action_label: __("OK"),
					primary_action: function() {
						d.hide();
						frm.reload_doc();
					}
				});
				d.show();
			} else if (r.message && r.message.error) {
				frappe.msgprint(__("Error: ") + r.message.error);
			} else {
				frappe.msgprint(__("Unknown error occurred during transfer"));
			}
		}
	});
}
