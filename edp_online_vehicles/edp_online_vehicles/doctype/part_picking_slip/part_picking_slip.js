// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Picking Slip", {
	refresh(frm) {
		if(!frm.is_new()){
			frm.add_custom_button('Create Parts Delivery Note', function(){
				frappe.model.with_doctype("Parts Delivery Note", function () {
					var doc = frappe.model.get_new_doc("Parts Delivery Note");
					doc.part_order_no = frm.doc.part_order_no;
					doc.ordered_by_user = frappe.session.user;
					doc.part_order_date_time = frm.doc.ordered_on_datetime;
					for (let child of frm.doc.table_qoik){
							var row = frappe.model.add_child(
								doc,
								"delivery_note_item",
							);
							row.part_no = child.part_no;
							row.qty_ordered = child.qty_ordered;
							row.outstanding_qty = child.qty_picked;
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

		let qty_ordered = row.qty_ordered || 0;
		let qty_picked = row.qty_picked || 0;
		let outstanding_qty = row.outstanding_qty || qty_ordered;

		if (row.qty_picked === null) {
			frappe.model.set_value(cdt, cdn, "qty_picked", 0);
			return;
		}

		if (qty_picked > outstanding_qty) {
			frappe.model.set_value(cdt, cdn, "qty_picked", 0);

			frappe.msgprint(
				"Qty Picked cannot be more than Outstanding Qty"
			);
			return;
		}

		let new_outstanding = qty_ordered - qty_picked;

		if (new_outstanding < 0) {
			new_outstanding = 0;
		}

		frappe.model.set_value(
			cdt,
			cdn,
			"outstanding_qty",
			new_outstanding
		);

		let total_picked = 0;

		(frm.doc.table_qoik || []).forEach(row => {
			total_picked += row.qty_picked || 0;
		});

		frm.set_value("total_qty_picked", total_picked);
	}
});
