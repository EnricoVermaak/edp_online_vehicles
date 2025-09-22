// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Request For Credit", {
	refresh(frm) {
		frm.set_query("order_no", "table_cxdf", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];

			if (d.part_ordered && frm.doc.dealer) {
				return {
					query: "edp_online_vehicles.events.custom_queries.part_rfc_order_filter",
					filters: {
						part: d.part_ordered || "",
						dealer: frm.doc.dealer || "",
					},
				};
			} else {
				frappe.throw(
					"Please set the part and dealer fields before trying to select a order",
				);
			}
		});
	},

	status(frm) {
		if (frm.doc.status == "Completed") {
			for (let row of frm.doc.table_cxdf) {
				if (row.status == "Pending") {
					frm.set_value("status", "In Progress");

					frappe.msgprint(
						"You cannot complete this Request for Service as there are still parts marked as 'Pending'",
					);

					break;
				}
			}
		}
	},
});
