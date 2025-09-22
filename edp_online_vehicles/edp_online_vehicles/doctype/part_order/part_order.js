// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Order", {
	search(frm) {
		if (frm.doc.company_reg_no) {
			frappe.call({
				method: "edp_online_vehicles.events.search_customer.get_fleet_cust_data",
				args: {
					reg_no: frm.doc.company_reg_no,
				},
				callback: function (r) {
					if (r.message) {
						console.log(r.message);

						let full_name = r.message[1] + " " + r.message[2];

						frm.set_value("fleet_customer_name", full_name);
						frm.set_value("fleet_customer", r.message[0]);
						frm.set_value("fleet_customer_mobile", r.message[3]);

						let reg_no = frm.doc.company_reg_no;
						let cleaned_reg_no = reg_no.replace(/\s/g, "");

						frm.set_value("company_reg_no", cleaned_reg_no);

						if (frm.doc.table_exgk) {
							frm.clear_table("table_exgk");
							frm.refresh_field("table_exgk");
						}
					} else {
						frm.set_value("company_reg_no", null);
						frappe.throw(__("Fleet customer not found."));
					}
				},
			});
		}
	},
	order_type: function (frm) {
		if (frm.doc.order_type === "Fleet") {
			frm.set_value("customer", null);
			frm.set_value("email", null);
			frm.set_value("phone", null);
			frm.set_value("full_name", null);
		} else {
			frm.set_value("company_reg_no", null);
			frm.set_value("fleet_customer", null);
			frm.set_value("fleet_customer_name", null);
		}
	},
	customer: function (frm) {
		if (frm.doc.customer) {
			frappe.db
				.get_value("Dealer Customer", { name: frm.doc.customer }, [
					"customer_name",
					"customer_surname",
					"mobile",
				])
				.then((response) => {
					if (response.message) {
						let data = response.message;
						let full_name =
							(data.customer_name || "") +
							" " +
							(data.customer_surname || "");
						let mobile = data.mobile || "";
						frm.set_value("full_name", full_name.trim());
						frm.set_value("mobile", mobile);
					}
				});
		}
	},

	before_save(frm) {
		if (!frm.doc.order_date_time) {
			frm.set_value("order_date_time", frappe.datetime.now_datetime());
		}

		if (frm.is_new()) {
			frm.set_value("order_delivery_time", "00:00:00");
			frm.set_value("_order_delivered", "0");
			frm.set_value("total_parts_delivered", "0");
		} else {
			frm.set_value("order_delivery_time", formatTimeDifference(frm));
		}
		let total_ordered = 0;
		for (let row of frm.doc.table_avsu) {
			total_ordered += row.qty;
		}
		let total_undelivered_parts_dealer_billing = 0;
		for (let row of frm.doc.table_avsu) {
			total_undelivered_parts_dealer_billing += row.dealer_billing_excl;
		}
		frm.set_value("total_parts_ordered", total_ordered);
		frm.set_value("total_undelivered_parts_qty", total_ordered);
		frm.set_value(
			"total_undelivered_parts_dealer_billing",
			total_undelivered_parts_dealer_billing,
		);
	},

	total_excl(frm) {
		let total_excl = frm.doc.total_excl;
		let vat = 0.15 * total_excl;
		let VATPromise = frm.set_value("vat", vat);
		let grand_totalPromise = frm.set_value("total_incl", vat + total_excl);

		return Promise.all([VATPromise, grand_totalPromise]);
	},

	refresh(frm) {
		if (frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.get_sales_person.get_sales_person",
				args: {
					user: frappe.session.user,
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("sales_person", r.message);
					}
				},
			});

			frappe.call({
				method: "edp_online_vehicles.events.get_default.get_default",
				args: {
					doctype: "Part Order Type",
					fieldname: "is_default",
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("order_type", r.message);
					}
				},
			});
		}
	},

	recalculate_totals(frm) {
		calculate_sub_total(frm, "total_excl", "table_avsu");
	},
});
frappe.ui.form.on("Part Order Item", {
	part_no(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		let sohPromise = frappe.db
			.get_value("Bin", { item_code: row.part_no }, "actual_qty")
			.then((soh) => {
				if (row.order_from == "BackOrder") {
					return frappe.model.set_value(cdt, cdn, "soh", 0);
				} else {
					return frappe.model.set_value(
						cdt,
						cdn,
						"soh",
						soh.message.actual_qty,
					);
				}
			});

		// Return the dealer billing amount from this promise.
		let pricePromise = frappe.db
			.get_value(
				"Item Price",
				{ item_code: row.part_no },
				"price_list_rate",
			)
			.then((dealer_billing) => {
				let dealer_billing_amount =
					dealer_billing.message.price_list_rate;
				return frappe.model
					.set_value(
						cdt,
						cdn,
						"dealer_billing_excl",
						dealer_billing_amount,
					)
					.then(() => dealer_billing_amount);
			});

		// Chain airfreightPromise to wait on pricePromise.
		let airfreightPromise = pricePromise.then((dealer_billing_amount) => {
			return frappe.db
				.get_single_value("Parts Settings", "air_freight_cost_")
				.then((air_freight_percentage) => {
					let airfreight =
						dealer_billing_amount * (air_freight_percentage / 100);
					return frappe.model
						.set_value(
							cdt,
							cdn,
							"air_freight_cost_excl",
							airfreight,
						)
						.then(() => {
							let total_excl =
								row.dealer_billing_excl -
								(row.disc_amount || 0) +
								(row.air_freight_cost_excl || 0);
							return frappe.model.set_value(
								cdt,
								cdn,
								"total_excl",
								total_excl,
							);
						});
				});
		});

		return Promise.all([sohPromise, pricePromise, airfreightPromise]);
	},

	table_avsu_remove(frm, cdt, cdn) {
		let removePromise = calculate_sub_total(
			frm,
			"total_excl",
			"table_avsu",
		);

		return Promise.all([removePromise]);
	},

	qty(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.qty && row.qty > 0) {
			let totalPromise = calculate_total(frm, cdt, cdn);
			return Promise.all([totalPromise]);
		} else {
			frappe.msgprint("Quantity must be greater than zero.");
			return frappe.model.set_value(cdt, cdn, "qty", 1).then(() => {
				return calculate_total(frm, cdt, cdn);
			});
		}
	},

	total_excl(frm) {
		let subTotalPromise = calculate_sub_total(
			frm,
			"total_excl",
			"table_avsu",
		);

		return Promise.all([subTotalPromise]);
	},
});

const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];

	if (!row.dealer_billing_excl || !row.qty) return;

	let total =
		(row.dealer_billing_excl -
			(row.disc_amount || 0) +
			(row.air_freight_cost_excl || 0)) *
		row.qty;
	return frappe.model.set_value(cdt, cdn, "total_excl", total);
};

const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.total_excl;
	}

	return frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

function formatTimeDifference(frm) {
	// Get the creation timestamp from the current document
	var creationStr = frm.doc.creation; // e.g. "2025-03-04 18:26:42.668546"
	// Create a Date object from the creation string
	var creationDate = new Date(creationStr);
	// Get the current time
	var now = new Date();

	// Calculate the difference in seconds
	var diffInSeconds = Math.floor((now - creationDate) / 1000);

	// Calculate hours, minutes, seconds
	var hours = Math.floor(diffInSeconds / 3600);
	var minutes = Math.floor((diffInSeconds % 3600) / 60);
	var seconds = diffInSeconds % 60;

	// Format as HH:MM:SS with two digits each
	return (
		hours.toString().padStart(2, "0") +
		":" +
		minutes.toString().padStart(2, "0") +
		":" +
		seconds.toString().padStart(2, "0")
	);
}
