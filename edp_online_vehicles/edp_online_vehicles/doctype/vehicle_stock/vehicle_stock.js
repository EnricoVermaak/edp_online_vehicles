// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let microdot = "";
let microdot_fitted_by = "";

frappe.ui.form.on("Vehicle Stock", {
	refresh: function (frm) {
		frm.add_custom_button(
			"Sell Vehicle",
			function () {
				frappe.model.with_doctype("Vehicle Retail", function () {
					var doc = frappe.model.get_new_doc("Vehicle Retail");

					var row = frappe.model.add_child(
						doc,
						"vehicles_sale_items",
					);
					row.vin_serial_no = frm.doc.name;
					row.model = frm.doc.model;
					row.colour = frm.doc.colour;
					row.interior_colour = frm.doc.interior_colour;

					frappe.set_route("Form", doc.doctype, doc.name);
				});
			},
			"Action",
		);

		if (frappe.user.has_role("Vehicles Administrator")) {
			frm.add_custom_button(
				"Transfer to Dealer",
				function () {
					const dialog = new frappe.ui.Dialog({
						title: __("Allocate Stock"),
						fields: [
							{
								label: __("Company"),
								fieldname: "company",
								fieldtype: "Link",
								options: "Company",
								reqd: 1,
							},
						],
						primary_action_label: __("Allocate"),
						primary_action(values) {
							if (!values.company) {
								frappe.msgprint(__("Please select a company."));
								return;
							}

							let company = values.company;

							console.log(company);

							// Call backend method to perform the allocation
							frappe.call({
								method: "edp_online_vehicles.events.allocate_stock.allocate_vehicle",
								args: {
									docname: frm.doc.name,
									company: company,
									user: frappe.session.user,
								},
							});

							dialog.hide();
						},
					});

					dialog.show();
				},
				"Action",
			);
		}
		frm.add_custom_button(
			"Report Vehicle As Stolen",
			function () {
				let availability_status = frm.doc.availability_status;
				if (availability_status === "Stolen") {
					frappe.msgprint(
						__("Vehicle has already been reported as stolen."),
					);
				} else if (availability_status === "Sold") {
					frappe.msgprint(
						__(
							"Vehicle has already been sold. A sold vehicle can not be reported as stolen.",
						),
					);
				} else if (availability_status === "Active Contract") {
					frappe.msgprint(
						__(
							"Vehicle is part of an active contract. A vehicle in an active contract cannot be reported as stolen.",
						),
					);
				} else if (availability_status === "Pending Sale") {
					frappe.msgprint(
						__(
							"Vehicle is part of an active sale. Please cancel the sale before reporting vehicle as stolen.",
						),
					);
				} else {
					const dialog = new frappe.ui.Dialog({
						title: "Report Vehicle as Stolen",
						fields: [
							{
								label: "Date/Time of Theft",
								fieldname: "date_time_of_theft",
								fieldtype: "Datetime",
								reqd: 1,
							},
						],
						primary_action_label: "Submit",
						primary_action(values) {
							frappe.call({
								method: "edp_online_vehicles.events.report_vehicle_as_stolen.report_vehicle_as_stolen",
								args: {
									vinno: frm.doc.vin_serial_no,
									availability_status:
										frm.doc.availability_status,
									dealer: frappe.defaults.get_default(
										"company",
									),
									date_time_of_theft:
										values.date_time_of_theft,
								},
								callback: function (r) {
									frm.refresh_field("availability_status");
								},
							});
							dialog.hide();
						},
					});
					dialog.show();
				}
			},
			"Action",
		);

		// frm.add_custom_button(__("Action 2")).addClass("btn-warning").css({'background-color':'black','font-weight': 'bold'});

		frm.set_query("colour", function () {
			return {
				filters: {
					model: frm.doc.model,
					discontinued: 0,
				},
			};
		});
	},

	onload(frm, dt, dn) {
		get_odo_reading(frm, dt, dn);

		// Fetch Request for Service related information
		frappe.db
			.get_list("Request for Service", {
				filters: {
					vin_serial_no: frm.doc.name,
					customer: frm.doc.customer,
				},
				fields: ["name", "request_for_service_date"],
			})
			.then((docs) => {
				if (docs.length > 0) {
					const docName = docs[0].name;
					frappe.db
						.get_doc("Request for Service", docName)
						.then((doc) => {
							let serviceDate = doc.request_for_service_date;
							frm.set_value("last_service_date", serviceDate);
						});
				}
			})
			.catch((error) => {
				console.error("Error fetching Request for Service:", error);
			});

		frappe.db
			.get_list("Vehicles Service", {
				filters: {
					vin_serial_no: frm.doc.name,
				},
				fields: ["name", "odo_reading_hours"],
				order_by: "creation desc",
				limit: 1,
			})
			.then((docs) => {
				if (docs.length > 0) {
					frappe.model.set_value(
						dt,
						dn,
						"last_service_hours",
						docs[0].odo_reading_hours,
					);
					if (!frm.is_dirty()) {
						frm.save();
					}
				}
			});

		frappe.call({
			method: "edp_online_vehicles.events.get_contract_details.get_latest_contract_details",
			args: {
				vinno: frm.doc.name,
			},
			callback: function (r) {
				const parentContracts = r.message;

				if (parentContracts.length > 0) {
					frappe.model.set_value(
						dt,
						dn,
						"contract_no",
						parentContracts[0].name,
					);
					frappe.model.set_value(
						dt,
						dn,
						"contract_status",
						parentContracts[0].custom_contract_status,
					);
					frappe.model.set_value(
						dt,
						dn,
						"contract_start_date",
						parentContracts[0].start_date,
					);
					frappe.model.set_value(
						dt,
						dn,
						"contract_end_date",
						parentContracts[0].end_date,
					);

					frm.save();
				}
			},
		});

		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");
		}

		frappe.call({
			method: "edp_online_vehicles.events.set_filters.get_users",
			args: {
				dealer: frm.doc.dealer,
			},
			callback: function (r) {
				let users = r.message;
				frm.set_query("microdot_fitted_by", function () {
					return {
						filters: {
							email: ["in", users],
						},
					};
				});
			},
		});

		// Attempt to retrieve the document by vin_serial_no
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Vehicles Dealer to Dealer Order",
				filters: {
					vin_serial_no: frm.doc.vin_serial_no, // Assuming vin_serial_no is in the current form's doc
				},
				fields: ["vin_serial_no"],
				// name: frm.doc.vin_serial_no // Assuming vin_serial_no is in the current form's doc
			},
			callback: function (response) {
				// Check if the document exists
				let dealer_to_dealer_order = response.message;
				if (dealer_to_dealer_order[0]) {
					// frm.fields_dict['ho_column_break'].wrapper.closest('.section-break').style.display = 'none';

					// const columnBreakWrapper = frm.fields_dict['ho_column_break'].wrapper;
					// columnBreakWrapper.style.display = 'none';

					// frm.fields_dict[field.ho_invoice_no].wrapper.style.display = 'none';
					// frm.fields_dict[field.ho_invoice_amt].wrapper.style.display = 'none';
					// frm.fields_dict[field.ho_invoice_date].wrapper.style.display = 'none';

					frm.fields_dict["ho_invoice_no"].toggle(false);
					frm.fields_dict["ho_invoice_amt"].toggle(false);
					frm.fields_dict["ho_invoice_date"].toggle(false);
					// frm.fields_dict['column_break_j2v4'].wrapper.style.display = 'none'
					// frm.fields_dict['pricing_section.column_break_j2v4'].toggle(false);
				}
			},
		});
	},
	before_save: function (frm) {
		if (frm.is_new()) {
			let doc = frm.doc;

			frm.vin_serial_no = doc.vin_serial_no.toUpperCase();

			if (frm.engine_no) {
				frm.engine_no = frm.engine_no.toUpperCase();
			}
		}

		if (frm.doc.microdot) {
			microdot = frm.doc.microdot;
		} else {
			microdot = false;
		}

		if (frm.doc.microdot_fitted_by) {
			microdot_fitted_by = frm.doc.microdot_fitted_by;
		} else {
			microdot_fitted_by = false;
		}

		frappe.call({
			method: "edp_online_vehicles.events.apply_microdot.test_new_stock_microdot",
			args: {
				vinno: frm.doc.name,
				microdot: microdot,
				dealer: frappe.defaults.get_default("company"),
				microdot_fitted_by: microdot_fitted_by,
			},
			callback: function (r) {},
		});
	},
	after_save: function (frm) {
		if (frm.doc.microdot === "") {
			frappe.call({
				method: "edp_online_vehicles.events.apply_microdot.update_stock",
				args: {
					vinno: frm.doc.vin_serial_no,
					microdot: "",
					microdot_fitted_by: "",
				},
				callback: function (r) {},
			});
		}
	},
	vin_serial_no(frm, dt, dn) {
		get_odo_reading(frm, dt, dn);
	},
	microdot(frm, dt, dn) {
		if (frm.doc.microdot === "") {
			frm.doc.microdot_fitted_by = "";
		}
	},
	model(frm, dt, dn) {
		if (frm.doc.last_load_test_date && frm.doc.last_service_date) {
			frappe.db
				.get_doc("Model Administration", frm.doc.model)
				.then((doc) => {
					// let loadTestIntervalMonths = doc.load_test_interval_months;
					let serviceIntervalMonths = doc.service_interval_months;

					// let lastLoadTestDate = new Date(frm.doc.last_load_test_date);
					let lastServiceDate = new Date(frm.doc.last_service_date);

					// let nextLoadTestDate = addMonths(lastLoadTestDate, loadTestIntervalMonths);
					let nextServiceDueDate = addMonths(
						lastServiceDate,
						serviceIntervalMonths,
					);

					// console.log("Next Service Due Date: ", nextServiceDueDate);
					// console.log("Next Load Test Date: ", nextLoadTestDate);

					// frappe.model.set_value(dt, dn, "next_load_test_date", nextLoadTestDate);
					frappe.model.set_value(
						dt,
						dn,
						"next_service_due_date",
						nextServiceDueDate,
					);
				})
				.catch((error) => {
					console.error(
						"Error fetching Model Administration document:",
						error,
					);
				});
		}
	},
	warranty_start_date(frm, dt, dn) {
		if (frm.doc.warranty_start_date) {
			let startDate = new Date(frm.doc.warranty_start_date);

			let months = cint(frm.doc.warranty_period_years);

        	let endDate = frappe.datetime.add_months(startDate, months);
        	frm.set_value("warranty_end_date", frappe.datetime.obj_to_str(endDate));

			frm.refresh_field("warranty_end_date");
		}
	},
	last_service_date(frm, dt, dn) {
		if (frm.doc.last_service_date) {
			let startDate = new Date(frm.doc.last_service_date);
			let months = cint(frm.doc.service_period_years);
			let endDate = frappe.datetime.add_months(startDate, months);
			frm.set_value("next_service_due_date", frappe.datetime.obj_to_str(endDate));
			frm.refresh_field("next_service_due_date");
		}
	},
});

function get_odo_reading(frm, dt, dn) {
	if (frm.doc.vin_serial_no) {
		frappe.db
			.get_list("Vehicles Service", {
				fields: ["name", "odo_reading_hours", "service_date", "model"],
				filters: {
					service_status: ["in", ["Approved", "Completed"]],
					vin_serial_no: frm.doc.name,
				},
				limit: 1,
				order_by: "creation desc",
			})
			.then((records) => {
				if (records && records.length > 0) {
					frappe.model.set_value(
						dt,
						dn,
						"last_service_hours",
						records[0].odo_reading_hours,
					);
					frappe.model.set_value(
						dt,
						dn,
						"last_service_date",
						records[0].service_date,
					);
					if (records[0].model) {
						frappe.db
							.get_doc("Model Administration", records[0].model)
							.then((doc) => {
								let service_date = new Date(
									records[0].service_date,
								);
								let months = doc.service_interval_months;
								let new_date = addMonths(service_date, months);
								frappe.model.set_value(
									dt,
									dn,
									"next_service_due_date",
									new_date,
								);
							});
					}
				}
			});
	}
}

function addMonths(date, months) {
	let result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}



frappe.ui.form.on("Vehicle Stock", {
	refresh(frm) {
		// Exterior Colour (links to Model Colour)
		frm.set_query("colour", function () {
			return {
				filters: {
					discontinued: 0,
					model: frm.doc.model || ""
				}
			};
		});

		// Interior Colour (links to Interior Model Colour)
		frm.set_query("interior_colour", function () {
			return {
				filters: {
					discontinued: 0,
					model: frm.doc.model || ""
				}
			};
		});

		// Disable colour fields if no model is selected
		frm.toggle_enable("colour", !!frm.doc.model);
		frm.toggle_enable("interior_colour", !!frm.doc.model);
	},

	model(frm) {
	// Clear colour fields when model changes
	frm.set_value("colour", null);
	frm.set_value("interior_colour", null);
	frm.toggle_enable("colour", !!frm.doc.model);
	frm.toggle_enable("interior_colour", !!frm.doc.model);
	}
});

