// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Request For Credit", {
	refresh(frm) {
		calc_totals(frm);

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
frappe.ui.form.on("table_cxdf",{
		return_qty: function(frm){
			calc_totals(frm);
		},
		approved_qty: function(frm){
			calc_totals(frm);
		},
		table_cxdf_remove: function(frm){
			calc_totals(frm);
		},
		table_cxdf_add: function(frm){
			calc_totals(frm);
		},
	});
function calc_totals(frm){
	let total_requested = 0;
	let total_approved = 0;

	(frm.doc.table_cxdf || []).forEach(row => {
		total_requested += row.return_qty || 0;
		total_approved += row.approved_qty || 0;
	});
	frm.set_value("total_parts", total_requested);
	frm.set_value("total_qty_parts_return_approved", total_approved);
}
