// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;
let customer_email = false;
let customer_phone = false;
let customer_mobile = false;
let customer_address = false;

frappe.ui.form.on("Vehicle Retail", {
	refresh(frm) {
		if (frm.doc.docstatus == 1) {
			frm.toggle_enable(["status"], false);
			frm.toggle_enable(["retail_date"], false);

			if (frappe.user.has_role("Vehicles Administrator")) {
				frm.add_custom_button(__("Reverse Retail"), () => {
					frappe.confirm(
						"Are you sure you want to Reverse the Retail Process for these Vehicles?",
						() => {
							//Yes selected
							let vinnos = [];

							for (let row of frm.doc.vehicles_sale_items) {
								vinnos.push(row.vin_serial_no);
							}

							frappe.call({
								method: "edp_online_vehicles.events.reverse_retail.reverse_retail",
								args: {
									docname: frm.doc.name,
								},
								callback: function (r) {
									if (r.message) {
										frappe.msgprint("Retail Reversed");
									}
								},
							});
						},
						() => {},
					);
				});
			}
		}

		let status_order = [];
		let myPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
				frappe.db
					.get_doc("Vehicle Stock Settings")
					.then((doc) => {
						status_order = doc.vehicle_sale_status_order;
						resolve(status_order);
					})
					.catch((err) => {
						reject(err);
					});
			}, 1000);
		});

		myPromise.then(() => {
			status_order = status_order
				.slice(0, status_order.length)
				.map((item) => item.status);

			status_order = status_order
				.map((status) => `'${status}'`)
				.join(", ");

			frm.set_query("status", function () {
				return {
					query: "edp_online_vehicles.events.vehicle_sale_status.get_status_order",
					filters: {
						status_order: status_order,
					},
				};
			});
		});

		if (frm.is_new() && !frm.doc.status) {
			frappe.call({
				method: "edp_online_vehicles.events.vehicle_sale_status.get_default",
				args: {
					doc_name: frm.doc.name,
				},
				callback: function (r) {
					frm.set_value("status", r.message);
				},
			});
		}

		previous_status_value = frm.doc.status;
	},
	onload: function (frm) {
		// Reset the field to its previous status if no new value is selected
		$(document).on("blur", '[data-fieldname="status"]', function () {
			if (!frm.doc.status || frm.doc.status === "") {
				frm.set_value("status", previous_status_value);
			}
		});

		frappe.call({
			method: "edp_online_vehicles.events.get_settings.get_retail_settings",
			callback: function (r) {
				if (r.message.allow_retail_date_change === "0") {
					frm.set_df_property("retail_date", "read_only", 1);
					frm.refresh_field("retail_date");
				}
				if (r.message.allow_microdot_allocation_on_retail === "0") {
					frm.fields_dict[
						"vehicles_sale_items"
					].grid.update_docfield_property(
						"microdot_fitted_by",
						"read_only",
						1,
					);
					frm.fields_dict[
						"vehicles_sale_items"
					].grid.update_docfield_property(
						"microdot_no",
						"read_only",
						1,
					);
					frm.refresh_field("vehicles_sale_items");
				}
			},
		});

		// if (frm.doc.docstatus != 1) {
		//   $(document).on('click', '[data-fieldname="status"]', function() {
		//     frm.set_value('status', '');
		//   });
		// }

		frappe.call({
			method: "edp_online_vehicles.events.set_filters.get_dealers",
			args: {
				user: frappe.user.name,
			},
			callback: function (r) {
				let dealers = r.message;
				frm.set_query("dealer", function () {
					return {
						filters: {
							name: ["in", dealers],
						},
					};
				});
			},
		});

		if (!frm.doc.sales_person) {
			frm.set_value("sales_person", frappe.user.name);

			frappe.db.get_doc("User", frappe.user.name).then((doc) => {
				if (doc) {
					frm.set_value("sales_person_full_names", doc.full_name);
				}
			});
		}
	},
	onload_post_render: function (frm) {
		$("p.help-box.small.text-muted").hide();

		frm.fields_dict.retail_date.datepicker.update({
			minDate: new Date(frappe.datetime.get_today()),
		});
		frm.fields_dict.payment_date.datepicker.update({
			minDate: new Date(frappe.datetime.get_today()),
		});
		frm.fields_dict.delivery_date.datepicker.update({
			minDate: new Date(frappe.datetime.get_today()),
		});
	},
	before_save(frm) {
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Vehicle Stock Settings",
			},
			callback: function (r) {
				if (r.message) {
					var settings = r.message;

					if (settings.auto_approve_sales) {
						let status = "Approved";
						frm.set_value("status", status);
					}
				}
			},
		});
	},
	after_save(frm) {
		let vin_serial_no = [];

		frm.doc["vehicles_sale_items"].forEach(function (row) {
			vin_serial_no.push(row.vin_serial_no);
		});

		if (vin_serial_no.length > 0) {
			frappe.call({
				method: "edp_online_vehicles.events.create_vehicles_sale.get_vehicles_stock_availability_status",
				args: {
					vinno: vin_serial_no.join(","),
					status: frm.doc.status,
					docname: frm.doc.name,
				},
				callback: function (r) {
					if (r.message === true) {
						frappe.call({
							method: "edp_online_vehicles.events.submit_document.submit_dealer_sale_document",
							args: {
								doc: frm.doc.name,
							},
							callback: function (r) {},
						});
					}
				},
			});
		} else {
			frappe.throw("Please add at least one Vehicle.");
		}

		if (
			frm.customer_address ||
			frm.customer_mobile ||
			frm.customer_phone ||
			frm.customer_email
		) {
			frm.call("update_dealer_customer");

			// frappe.db.set_value(
			//   'Dealer Customer', frm.doc.customer, {
			//     'email': frm.doc.customer_email,
			//     'mobile': frm.doc.customer_mobile,
			//     'phone': frm.doc.customer_phone,
			//     'address': frm.doc.customer_address
			//   }
			// )
		}
	},
	before_submit(frm) {
		if (frm.doc.status === "Pending") {
			frappe.msgprint(
				__(
					"The sale cannot be submitted because the current status is Pending. Please update the status to proceed.",
				),
			);
			frappe.validated = false;
		}
	},
	after_submit(frm) {
		for (const row of frm.doc["vehicles_sale_items"]) {
			row.profit_loss_amount = row.retail_amount - row.ho_invoice_amount;
			row.profit_loss_ =
				((row.retail_amount - row.ho_invoice_amount) /
					row.retail_amount) *
				100;
		}

		// frappe.confirm(
		//   'Do you want to release to NATIS?',
		//   function () {
		//     let vinno = [];
		//     frm.doc.vehicles_sale_items.forEach(function(row) {
		//         vinno.push(row.vin_serial_no);
		//     });
		//     frappe.call({
		//       method: "edp_online_vehicles.events.create_tracking_doc.create_tracking_doc",
		//       args: {
		//           vinno: vinno,
		//           retail_doc_name: frm.doc.name
		//       },
		//       callback: function(r) {
		//           if (!r.exc) {
		//               frappe.msgprint("NATIS release requested succesfully.");
		//               frm.refresh()
		//           }
		//       }
		//     });
		//   },
		// );
	},
	after_cancel: function (frm) {
		// Call the server-side method to handle the cancellation
		frappe.call({
			method: "edp_online_vehicles.events.create_vehicles_sale.return_to_stock_on_sale",
			args: {
				docname: frm.doc.name,
			},
			callback: function (r) {
				// You can handle the server response here (if needed)
				console.log(r.message);
			},
		});
	},
	dealer(frm) {
		frappe.call({
			method: "edp_online_vehicles.events.set_filters.get_users",
			args: {
				dealer: frm.doc.dealer,
			},
			callback: function (r) {
				let users = r.message;
				frm.set_query("sales_person", function () {
					return {
						filters: {
							email: ["in", users],
						},
					};
				});
			},
		});
	},
	customer: function (frm) {
		frappe.db
			.get_value("Dealer Customer", { name: frm.doc.customer }, [
				"customer_name",
				"customer_surname",
				"mobile",
			])
			.then((response) => {
				if (response.message) {
					let data = response.message;
					log
					let full_name =
						(data.customer_name || "") +
						" " +
						(data.customer_surname || "");
					let mobile = data.mobile || "";
					frm.set_value("customer_name", full_name.trim());
					frm.set_value("customer_mobile", mobile);
				}
			});
	},
	sale_type: function (frm) {
		if (frm.doc.sale_type === "Fleet") {
			frm.set_value("customer", null);
			frm.set_value("customer_address", null);
			frm.set_value("customer_email", null);
			frm.set_value("customer_phone", null);
			frm.set_value("customer_name", null);
		} else {
			frm.set_value("company_reg_no", null);
			frm.set_value("fleet_customer", null);
			frm.set_value("fleet_customer_name", null);
		}
	},
	company_reg_no: function (frm) {
		// if (frm.doc.company_reg_no) {
		//   frappe.call({
		//       method: "edp_online_vehicles.events.search_customer.search_fleet_customer",
		//       args: {
		//           reg_no: frm.doc.company_reg_no
		//       },
		//       callback: function(r) {
		//           if (!(r.message && r.message.fleet_customer === frm.doc.fleet_customer)) {
		//               frm.set_value("fleet_customer_name", null);
		//               frm.set_value("fleet_customer", null);
		//               frm.set_value("fleet_customer_mobile", null);
		//           }
		//       }
		//   });
		// }
	},
	customer_phone: function (frm) {
		frm.customer_phone = frm.doc.customer_phone;
	},
	customer_email: function (frm) {
		frm.customer_email = frm.doc.customer_email;
	},
	customer_mobile: function (frm) {
		frm.customer_mobile = frm.doc.customer_mobile;
	},
	customer_address: function (frm) {
		frm.customer_address = frm.doc.customer_address;
	},
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
						frm.set_value("fleet_customer_name", "");
						frm.set_value("fleet_customer", "");
						frm.set_value("fleet_customer_mobile", "");
						frappe.throw(__("Fleet customer not found."));
					}
				},
			});
		}
	},
	add_fleet_customer(frm) {
		frm.set_value("company_reg_no", null);
		frm.set_value("fleet_customer_name", "");
		frm.set_value("fleet_customer", "");
		frm.set_value("fleet_customer_mobile", "");

		const dialog = new frappe.ui.Dialog({
			title: __("New Fleet Customer"),
			fields: [
				{
					label: __("Customer Type"),
					fieldname: "customer_type",
					fieldtype: "Link",
					options: "Fleet Customer Category",
					reqd: 1,
				},
				{
					label: __("Dealership"),
					fieldname: "company",
					fieldtype: "Data",
					read_only: 1,
					default: frm.doc.dealer,
				},
				{
					label: __("Company Name"),
					fieldname: "company_name",
					fieldtype: "Data",
				},
				{
					label: __("Company Reg No"),
					fieldname: "company_reg_no",
					fieldtype: "Data",
					reqd: 1,
				},
				{
					label: __("Customer Name"),
					fieldname: "customer_name",
					fieldtype: "Data",
					reqd: 1,
				},
				{
					label: __("Customer Surname"),
					fieldname: "customer_surname",
					fieldtype: "Data",
				},
				{
					label: __("Mobile"),
					fieldname: "mobile",
					fieldtype: "Phone",
					reqd: 1,
				},
				{
					label: __("Email"),
					fieldname: "email",
					fieldtype: "Data",
					reqd: 1,
				},

				{
					fieldtype: "Column Break",
				},

				{
					label: __("Address"),
					fieldname: "address",
					fieldtype: "Small Text",
					reqd: 1,
				},
				{
					label: __("Suburb"),
					fieldname: "suburb",
					fieldtype: "Data",
					reqd: 1,
				},
				{
					label: __("City/ Town"),
					fieldname: "city_town",
					fieldtype: "Data",
					reqd: 1,
				},
				{
					label: __("Country"),
					fieldname: "country",
					fieldtype: "Data",
					reqd: 1,
				},
				{
					label: __("Province/ State"),
					fieldname: "province_state",
					fieldtype: "Link",
					options: "Province or State",
					reqd: 1,
				},
				{
					label: __("Postal Code"),
					fieldname: "code",
					fieldtype: "Data",
					reqd: 1,
				},
				// {
				//     fieldtype: 'Section Break'
				// },
				{
					fieldtype: "Column Break",
				},
				{
					label: __(
						"Would you like to receive marketing updates via SMS?",
					),
					fieldname:
						"would_you_like_to_receive_marketing_updates_via_SMS",
					fieldtype: "Select",
					options: ["Yes", "No"],
					reqd: 1,
				},
				{
					label: __(
						"Would you like to receive marketing updates via Email?",
					),
					fieldname:
						"would_you_like_to_receive_marketing_updates_via_email",
					fieldtype: "Select",
					options: ["Yes", "No"],
					reqd: 1,
				},
				{
					label: __(
						"Would you like to receive marketing updates via Post?",
					),
					fieldname:
						"would_you_like_to_receive_marketing_updates_via_post",
					fieldtype: "Select",
					options: ["Yes", "No"],
					reqd: 1,
				},
				{
					label: __(
						"Did you confirm all POPI regulations with your customer?",
					),
					fieldname:
						"did_you_confirm_all_popi_regulations_with_your_customer",
					fieldtype: "Select",
					options: ["Yes", "No"],
					reqd: 1,
				},
			],
			size: "extra-large",
			primary_action_label: __("Save"),
			primary_action(values) {
				frappe.call({
					method: "edp_online_vehicles.events.create_customer.create_fleet_customer",
					args: {
						customer_type: values.customer_type || "",
						company: values.company || "",
						company_name: values.company_name || "",
						company_reg_no: values.company_reg_no || "",
						customer_name: values.customer_name || "",
						customer_surname: values.customer_surname || "",
						mobile: values.mobile || "",
						email: values.email || "",
						address: values.address || "",
						suburb: values.suburb || "",
						city_town: values.city_town || "",
						country: values.country || "",
						province_state: values.province_state || "",
						code: values.code || "",
						would_you_like_to_receive_marketing_updates_via_SMS:
							values.would_you_like_to_receive_marketing_updates_via_SMS ||
							"",
						would_you_like_to_receive_marketing_updates_via_email:
							values.would_you_like_to_receive_marketing_updates_via_email ||
							"",
						would_you_like_to_receive_marketing_updates_via_post:
							values.would_you_like_to_receive_marketing_updates_via_post ||
							"",
						did_you_confirm_all_popi_regulations_with_your_customer:
							values.did_you_confirm_all_popi_regulations_with_your_customer ||
							"",
					},
					callback: function (r) {
						if (!r.exc) {
							frappe.msgprint({
								title: __("Success"),
								message: __(
									"Fleet Customer was created successfully.",
								),
								indicator: "green",
							});
							dialog.hide();

							frm.set_value(
								"company_reg_no",
								values.company_reg_no,
							);
							frm.set_value("fleet_customer", r.message);
						}
					},
				});
			},
		});

		dialog.show();
	},
});

frappe.ui.form.on("Vehicles Sale Items", {
	vin_serial_no(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		frappe.db
			.get_list("Vehicle Stock", {
				filters: {
					vin_serial_no: row.vin_serial_no,
					availability_status: "Stolen",
				},
				fields: ["name"],
			})
			.then((existing_services) => {
				if (existing_services.length > 0) {
					frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
					frappe.throw(
						"This vehicle was reported as stolen. Please contact Head Office immediately for more information",
					);
				} else {
					frappe.call({
						method: "edp_online_vehicles.events.check_stock_availability.check_stock_availability",
						args: {
							vinno: row.vin_serial_no,
						},
						callback: function (r) {
							if (r.message === "Not Available") {
								frappe.model.set_value(
									cdt,
									cdn,
									"vin_serial_no",
									null,
								);
								frappe.model.set_value(cdt, cdn, "model", "");
								frappe.model.set_value(cdt, cdn, "colour", "");

								frappe.msgprint({
									title: __("Not Available"),
									message: __(
										"The given Vin/Serial Number is not available to be sold. Please ensure you only select available Vin/Serial Numbers from the list.",
									),
									indicator: "red",
								});
							}
						},
						error: function (xhr) {
							console.error(
								"API call failed. Status:",
								xhr.status,
							);
							console.error("Response Text:", xhr.responseText);
							console.error("Ready State:", xhr.readyState);
							console.error("Status Text:", xhr.statusText);
						},
					});
				}
			});
	},

	retail_amount(frm, cdt, cdn) {
		update_total_retail_excl(frm);
	}
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

const update_total_retail_excl = (frm) => {
    let total = 0;
    for (const row of frm.doc.vehicles_sale_items || []) {
        total += flt(row.retail_amount);
    }
    frm.set_value("total_retail_excl", total);
};
