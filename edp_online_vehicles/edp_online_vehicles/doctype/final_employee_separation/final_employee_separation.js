// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Final Employee Separation", {
	refresh(frm) {
		frm.fields_dict["table_fhuq"].grid.add_custom_button(
			__("Refresh"),
			function () {
				frm.doc.table_fhuq = [];
				frappe.db
					.get_list("Asset", {
						filters: {
							custodian: frm.doc.employee,
						},
						fields: [
							"item_code",
							"asset_category",
							"location",
							"gross_purchase_amount",
						],
					})
					.then((docs) => {
						for (let row of docs) {
							frm.add_child("table_fhuq", {
								item_code: row.item_code,
								asset_category: row.asset_category,
								location: row.location,
								gross_purchase_amount:
									row.gross_purchase_amount,
							});
						}

						frm.refresh_field("table_fhuq");
						frm.save();
					});
			},
		);
	},
	after_save: function (frm) {
		if (frm.doc.status == "Completed") {
			frappe.call({
				method: "edp_online_vehicles.events.update_employee_details.update_employee_details",
				args: {
					id: frm.doc.employee,
					relieving_date: frm.doc.relieving_date,
				},
			});
		}
	},
	before_submit: function (frm) {
		if (!frm.doc.status == "Completed") {
			frappe.throw(
				"Please set document Status to Completed before submitting",
			);
		}
	},
});
