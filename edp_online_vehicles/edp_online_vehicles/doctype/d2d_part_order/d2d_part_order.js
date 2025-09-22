// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("D2D Part Order", {
	refresh(frm) {
		if (!frm.is_new()) {
			let declined = false;
			var declined_items = [];

			for (let row of frm.doc.table_oqak) {
				if (row.status == "Declined") {
					declined = true;
					break;
				}
			}

			if (declined) {
				let default_user_company =
					frappe.defaults.get_user_default("company");

				if (default_user_company == frm.doc.order_placed_by) {
					frm.add_custom_button("Place HQ Order", () => {
						for (let row of frm.doc.table_oqak) {
							if (row.status == "Declined") {
								declined_items.push(row);
							}
						}

						frappe.route_options = {
							parts: declined_items,
						};

						frappe.set_route("app/part-order-1");
					});
				}
			}
		}
	},
});

frappe.ui.form.on("D2D Part Order Items", {
	qty_delivered(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.qty_delivered === null) {
			frappe.model.set_value(cdt, cdn, "qty_delivered", 0);
		}

		if (row.qty_delivered > 0) {
			if (row.qty_delivered > row.qty_ordered) {
				frappe.model.set_value(cdt, cdn, "qty_delivered", 0);

				frappe.msgprint(
					"Qty Delivered cannot be more than Qty Ordered",
				);
			}

			let total_delivered = 0;

			for (let row of frm.doc.delivery_note_item) {
				total_delivered += row.qty_delivered;
			}

			frm.set_value("qty_delivered", total_delivered);
			frm.set_value(
				"_delivered",
				(total_delivered / frm.doc.qty_ordered) * 100,
			);
		}
	},
});
