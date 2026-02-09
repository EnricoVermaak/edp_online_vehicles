// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Picking Slip", {
	refresh(frm) {
		if(!frm.is_new()){
			frm.add_custom_button('Create Delivery Note', function(){
				frappe.model.with_doctype("Delivery Note", function () {
					var doc = frappe.model.get_new_doc("Delivery Note");
					doc.part_picking_slip = frm.doc.name;
					for (let child of frm.doc.table_qoik){
							var row = frappe.model.add_child(
								doc,
								"items",
							);
							row.item_code = child.part_no;
							row.qty = child.qty_ordered;
						}
					frappe.set_route("Form", doc.doctype, doc.name);
				}); 
			}) 	
		}
	
		if (frm.doc.table_qoik.length == 0) {
			if (frm.doc.part_order_no) {
				frappe.db
					.get_doc("HQ Part Order", frm.doc.part_order_no)
					.then((doc) => {
						for (let row of doc.table_qmpy) {
							let outstanding_qty =
								row.qty_ordered - row.qty_picked;

							frm.add_child("table_qoik", {
								part_no: row.part_no,
								description: row.part_description,
								qty_ordered: row.qty_ordered,
								outstanding_qty: outstanding_qty,
							});
						}

						frm.refresh_field("table_qoik");

						let total_qty_ordered = 0;

						if (frm.doc.table_qoik.length > 0) {
							for (let row of frm.doc.table_qoik) {
								total_qty_ordered += row.qty_ordered;
							}
						}

						frm.set_value("total_qty_ordered", total_qty_ordered);
						frm.set_value("ordered_bydealer", doc.dealer);
						frm.set_value(
							"ordered_on_datetime",
							doc.order_date_time,
						);
					});
			}
		}

		if (frm.is_new()) {
			frm.set_value("total_qty_picked", 0);
		}
	},
	part_order_no(frm) {
		frm.clear_table("table_qoik");
		if (frm.doc.part_order_no) {
			frappe.db
				.get_doc("HQ Part Order", frm.doc.part_order_no)
				.then((doc) => {
					for (let row of doc.table_ugma) {
						// let outstanding_qty = row.qty_ordered - row.qty_picked;

						frm.add_child("table_qoik", {
							part_no: row.part_no,
							description: row.description,
							qty_ordered: row.qty,
							qty_picked: row.qty_picked,
							outstanding_qty: row.qty - row.qty_picked,
						});
					}

					frm.refresh_field("table_qoik");

					let total_qty_ordered = 0;
					let total_qty_picked = 0;
					if (frm.doc.table_qoik.length > 0) {
						for (let row of frm.doc.table_qoik) {
							total_qty_ordered += row.qty_ordered;
							total_qty_picked += row.qty_picked;
						}
					}

					frm.set_value("total_qty_ordered", total_qty_ordered);
					frm.set_value("total_qty_picked", total_qty_picked);
					frm.set_value("ordered_bydealer", doc.dealer);
					frm.set_value(
						"ordered_on_datetime",
						doc.order_date_time,
					);
				});
		}
	}

});

frappe.ui.form.on("Part Picking Slip Items", {
	qty_picked(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.qty_picked === null) {
			frappe.model.set_value(cdt, cdn, "qty_picked", 0);
		}

		if (row.qty_picked > 0) {
			if (row.qty_picked > row.outstanding_qty) {
				frappe.model.set_value(cdt, cdn, "qty_picked", 0);

				frappe.msgprint(
					"Qty Picked cannot be more than Outstanding Qty",
				);
			}

			let total_picked = 0;

			for (let row of frm.doc.table_qoik) {
				total_picked += row.qty_picked;
			}

			frm.set_value("total_qty_picked", total_picked);
		}
	},
});
