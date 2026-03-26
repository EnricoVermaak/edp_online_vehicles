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
frappe.ui.form.on("Part Request For Credit Item", {
    part_ordered: function(row_frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.part_ordered) {
            frappe.db.get_value("Item Price", {
                item_code: row.part_ordered,
                price_list: "Standard Selling"
            }, "price_list_rate")
            .then(r => {
                let price = r.message ? r.message.price_list_rate : 0;
                
                frappe.model.set_value(cdt, cdn, "item_price", price);
                
                calc_totals(row_frm);
            });
        }
    },

    return_qty: function(frm) { calc_totals(frm); },
    approved_qty: function(frm) { calc_totals(frm); },
    table_cxdf_remove: function(frm) { calc_totals(frm); }
});

function calc_totals(frm) {
    let total_requested = 0;
    let total_approved = 0;
    let total_price_req = 0;
    let total_price_app = 0;

    (frm.doc.table_cxdf || []).forEach(row => {
        let price = flt(row.item_price);
        let q_req = flt(row.return_qty);
        let q_app = flt(row.approved_qty);

        total_requested += q_req;
        total_approved += q_app;
        total_price_req += (q_req * price);
        total_price_app += (q_app * price);
    });

    frm.set_value("total_parts", total_requested);
    frm.set_value("total_qty_parts_return_approved", total_approved);
    frm.set_value("total_excl", total_price_req);
    frm.set_value("total_excl_return_approved", total_price_app);

    frm.refresh_field("total_parts");
    frm.refresh_field("total_qty_parts_return_approved");
    frm.refresh_field("total_excl");
    frm.refresh_field("total_excl_return_approved");
}
