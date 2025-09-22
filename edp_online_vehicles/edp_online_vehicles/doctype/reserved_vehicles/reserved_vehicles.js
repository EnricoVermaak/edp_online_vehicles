// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt
let reserved_comment = null;
let is_new_doc = false;
frappe.ui.form.on("Reserved Vehicles", {
	refresh: function (frm) {
		frm.set_query("vin_serial_no", function () {
			return {
				filters: {
					availability_status: "Available",
				},
			};
		});
	},
	reserve_to_date: function (frm) {
		if (frm.doc.reserve_from_date) {
			if (frm.doc.reserve_to_date) {
				let reserve_to_date = new Date(frm.doc.reserve_to_date);
				let reserve_from_date = new Date(frm.doc.reserve_from_date);

				if (reserve_to_date === reserve_from_date) {
					frm.doc.total_days = 0;
					return;
				}

				frappe.call({
					method: "edp_online_vehicles.events.calculate_days.calculate_days",
					args: {
						from_date: frm.doc.reserve_from_date,
						to_date: frm.doc.reserve_to_date,
					},
					callback: function (r) {
						if (r.message) {
							let days = r.message;

							frappe.model.set_value(
								frm.doc.doctype,
								frm.doc.name,
								"total_days",
								days,
							);
						}
					},
				});
			}
		}
	},
	onload(frm) {
		if (!frm.is_new()) {
			if (frm.doc.reserve_to_date) {
				frappe.call({
					method: "edp_online_vehicles.events.calculate_days.calculate_days",
					args: {
						from_date: frm.doc.reserve_from_date,
						to_date: frm.doc.reserve_to_date,
					},
					callback: function (r) {
						if (r.message) {
							let days = r.message;

							frappe.model.set_value(
								frm.doc.doctype,
								frm.doc.name,
								"total_days",
								days,
							);
						}
					},
				});
			}
		}
		frm.reserved_comment = null;
	},
	onload_post_render: function (frm) {
		frm.fields_dict.reserve_to_date.datepicker.update({
			minDate: frappe.datetime.str_to_obj(
				frappe.datetime.add_days(frappe.datetime.get_today(), 1),
			),
		});
	},

	before_save: function (frm) {
		if (frm.doc.reserve_to_date) {
			let today_date = frappe.datetime.nowdate();

			let to_date = frm.doc.reserve_to_date;

			if (to_date === today_date) {
				frappe.model.set_value(
					frm.doc.doctype,
					frm.doc.name,
					"status",
					"Available",
				);
			}
		}

		if (frm.doc.status === "Available" && frm.reserved_comment === null) {
			frappe.validated = false;

			const dialog = new frappe.ui.Dialog({
				title: __("Reason"),
				fields: [
					{
						label: "Please provide a reason for unreserving this vehicle.",
						fieldname: "comment",
						fieldtype: "Data",
						reqd: 1,
					},
				],
				primary_action_label: "Submit",
				primary_action(values) {
					if (values.comment) {
						frm.reserved_comment = values.comment;
						dialog.hide();
						frappe.validated = true;
						frm.save();
						frm.refresh();
					} else {
						frappe.msgprint(
							__("Comment is required to unreserve the vehicle."),
						);
					}
				},
			});

			dialog.show();
		}

		frm.is_new_doc = frm.is_new();
	},
	after_save(frm) {
		if (frm.doc.status === "Available") {
			frappe.call({
				method: "edp_online_vehicles.events.submit_document.submit_reserved_vehicles",
				args: {
					doc: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							5,
						);
					}
				},
			});
			frappe.call({
				method: "edp_online_vehicles.events.reserved_vehicles.update_stock",
				args: {
					message: "User Comment: " + frm.reserved_comment,
					vinno: frm.doc.vin_serial_no,
					status: "Available",
				},
				callback: function (r) {},
			});
		} else if (frm.doc.status === "Reserved" && frm.is_new_doc === 1) {
			let userFullName = null;
			frappe.db
				.get_value("User", frappe.session.user, "full_name")
				.then((response) => {
					userFullName = response.message.full_name || "Unknown User";
					frappe.call({
						method: "edp_online_vehicles.events.reserved_vehicles.update_stock",
						args: {
							message:
								"Vehicle has been reserved by " + userFullName,
							status: "Reserved",
							vinno: frm.doc.vin_serial_no,
						},
						callback: function (r) {
							// frm.refresh()
						},
					});
				})
				.catch((error) => {
					console.error("Error fetching user full name: ", error);
				});
		}
	},
	vin_serial_no(frm) {
		frappe.db
			.get_value(
				"Vehicle Stock",
				{ vin_serial_no: frm.doc.vin_serial_no },
				"availability_status",
			)
			.then((response) => {
				const status = response.message?.availability_status;
				if (status !== "Available") {
					frm.set_value("vin_serial_no", null);
				}
			});
	},
});
