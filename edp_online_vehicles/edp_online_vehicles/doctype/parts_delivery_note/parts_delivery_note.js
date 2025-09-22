// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Parts Delivery Note", {
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

	refresh(frm) {
		if (frm.doc.delivery_note_item.length == 0) {
			if (frm.doc.part_order_no) {
				frappe.db
					.get_doc("HQ Part Order", frm.doc.part_order_no)
					.then((doc) => {
						for (let row of doc.table_qmpy) {
							let outstanding_qty =
								row.qty_ordered - row.qty_delivered;

							frm.add_child("delivery_note_item", {
								part_no: row.part_no,
								description: row.part_description,
								qty_ordered: row.qty_ordered,
								outstanding_qty: outstanding_qty,
							});
						}

						frm.refresh_field("delivery_note_item");

						let total_qty_ordered = 0;

						if (frm.doc.delivery_note_item.length > 0) {
							for (let row of frm.doc.delivery_note_item) {
								total_qty_ordered += row.qty_ordered;
							}
						}

						frm.set_value(
							"part_order_date_time",
							doc.order_date_time,
						);
						frm.set_value("total_qty_ordered", total_qty_ordered);

						frappe.db
							.get_value("User", frappe.session.user, "full_name")
							.then((response) => {
								frm.set_value(
									"ordered_by_user",
									response.message.full_name,
								);
							});
					});
			} else if (frm.doc.d2d_part_order) {
				frappe.db
					.get_doc("D2D Part Order", frm.doc.d2d_part_order)
					.then((doc) => {
						for (let row of doc.table_mzrh) {
							let outstanding_qty =
								row.qty_ordered - row.qty_delivered;

							frm.add_child("delivery_note_item", {
								part_no: row.part_no,
								description: row.part_description,
								qty_ordered: row.qty_ordered,
								outstanding_qty: outstanding_qty,
								dealer: row.dealer,
							});
						}

						frm.refresh_field("delivery_note_item");

						let total_qty_ordered = 0;

						if (frm.doc.delivery_note_item.length > 0) {
							for (let row of frm.doc.delivery_note_item) {
								total_qty_ordered += row.qty_ordered;
							}
						}

						frm.set_value(
							"part_order_date_time",
							doc.order_datetime,
						);
						frm.set_value("total_qty_ordered", total_qty_ordered);

						frappe.db
							.get_value("User", frappe.session.user, "full_name")
							.then((response) => {
								frm.set_value(
									"ordered_by_user",
									response.message.full_name,
								);
							});
					});
			}
		}
		if (frm.is_new()) {
			frm.set_value("total_qty_delivered", 0);
		}
	},
	deliver_to(frm) {
		if (frm.doc.deliver_to === "Dealer") {
			frm.set_value("customer_address", null);
			frm.set_value("customer_mobile", "");
			frm.set_value("customer_phone", "");
			frm.set_value("customer_email", "");
			frm.set_value("customer", "");
			frm.set_value("customer_name", "");
		}
	},
	after_save(frm) {
		// frappe.call({
		//     method: "edp_online_vehicles.events.update_part_order_summary.update_delivered_parts",
		//     args: {
		//         part_order_no:frm.doc.part_order_no,
		//         parts:frm.doc.delivery_note_item
		//     },
		//     callback: function(r) {
		//     }
		// })
	},
});

frappe.ui.form.on("Parts Delivery Note Items", {
	qty_delivered(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.qty_delivered === null) {
			frappe.model.set_value(cdt, cdn, "qty_delivered", 0);
		}

		if (row.qty_delivered > 0) {
			if (row.qty_delivered > row.outstanding_qty) {
				frappe.model.set_value(cdt, cdn, "qty_delivered", 0);

				frappe.msgprint(
					"Qty Delivered cannot be more than Outstanding Qty",
				);
			}

			let total_delivered = 0;

			for (let row of frm.doc.delivery_note_item) {
				total_delivered += row.qty_delivered;
			}

			frm.set_value("total_qty_delivered", total_delivered);
		}
	},
});
