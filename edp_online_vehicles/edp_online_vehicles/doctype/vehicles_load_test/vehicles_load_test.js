// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Load Test", {
	refresh(frm) {
		setTimeout(() => {
			const element = document.getElementById(
				"vehicles-load-test-test_info_tab-tab",
			);
			element.addEventListener("click", function () {
				if (!frm.doc.vin_serial_no) {
					setTimeout(() => {
						$("#Vehicles-load-test-__details-tab").click();
						frappe.throw("Please Enter VIN Serial No.");
					}, 100);
				}
			});
		}, 500);

		if (!frm.is_new()) {
			frm.add_custom_button(
				"Request For Service",
				() => {
					frappe.call({
						method: "edp_online_vehicles.events.rfs_child_add.rfs_load_tests",
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
				"Create",
			);

			frm.add_custom_button(
				"Service",
				() => {
					frappe.call({
						method: "edp_online_vehicles.events.create_service.load_test_create_service",
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
				"Create",
			);

			frm.add_custom_button(
				"Internal Docs and Notes",
				() => {
					console.log(frm);

					frappe.model.open_mapped_doc({
						method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.doctype.vehicles_load_test.vehicles_load_test.create_internal_docs_notes",
						frm: frm,
					});
				},
				"Create",
			);
		}
	},
	onload(frm, dt, dn) {
		frm.set_query("load_test_template", () => {
			return {
				filters: {
					type: "Load Test",
				},
			};
		});

		if (!frm.doc.dealer) {
			frm.doc.dealer = frappe.defaults.get_default("company");
		}
	},

	vin_serial_no(frm, dt, dn) {
		if (frm.is_new()) {
			let seven_days_ago = frappe.datetime.add_days(
				frappe.datetime.get_today(),
				-7,
			);

			frappe.db
				.get_list("Vehicles Load Test", {
					filters: {
						vin_serial_no: frm.doc.vin_serial_no,
						creation: [">=", seven_days_ago],
					},
					fields: ["name"],
				})
				.then((existing_services) => {
					if (existing_services.length > 0) {
						frappe.msgprint(
							"Please be aware that a service request for this vehicle has been submitted within the last 7 days.",
						);
					}
				});
		}

		if (frm.doc.vin_serial_no) {
			frappe.db
				.get_list("Vehicles Service Inspection", {
					fields: ["creation"],
					filters: {
						vin_serial_no: frm.doc.vin_serial_no,
					},
					limit: 1,
					order_by: "creation desc",
				})
				.then((records) => {
					if (records && records.length > 0) {
						frappe.db
							.get_doc("Model Administration", frm.doc.model)
							.then((doc) => {
								let inspection_date = new Date(
									records[0].creation,
								);
								let month =
									doc.service_inspection_interval_months;
								let new_date = addMonths(
									inspection_date,
									month,
								);
								frappe.model.set_value(
									dt,
									dn,
									"next_inspection_date",
									new_date,
								);
							});
					}
				});
		}
	},
	load_test_template(frm, dt, dn) {
		if (frm.doc.load_test_template) {
			frm.doc.load_test_items = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.load_test_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("load_test_items", {
							description: row.description,
						});
						frm.refresh_field("load_test_items");
					}
				});
		} else {
			frm.doc.load_test_items = [];
			frm.refresh_field("load_test_items");
		}
	},
	tested_on(frm, dt, dn) {
		if (frm.doc.model) {
			let tested_on_date = frm.doc.tested_on;

			frappe.db
				.get_doc("Model Administration", frm.doc.model)
				.then((doc) => {
					let month = doc.load_test_interval_months;
					let tested_date = new Date(tested_on_date);

					let new_date = addMonths(tested_date, month);
					frappe.model.set_value(dt, dn, "next_load_test", new_date);
				});
		}
	},
});
frappe.ui.form.on("Vehicles Load Test Items", {
	status(frm) {
		let pass_rows = 0;
		let total_rows = 0;
		for (let row of frm.doc.load_test_items) {
			if (row.status == "Pass") {
				pass_rows += 1;
			}
			total_rows += 1;
		}
		let calculation = (pass_rows / total_rows) * 100;
		frappe.model.set_value(
			frm.doc.doctype,
			frm.doc.name,
			"load_test_at",
			calculation,
		);
	},
});

function addMonths(date, months) {
	let result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}
