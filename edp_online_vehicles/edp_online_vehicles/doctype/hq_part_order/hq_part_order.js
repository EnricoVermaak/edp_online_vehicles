// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("HQ Part Order", {
	refresh(frm) {
		if(!frm.is_new()){
			frm.add_custom_button("Create Part Picking Slip", function () {
				frappe.model.with_doctype("Part Picking Slip", function () {
					var doc = frappe.model.get_new_doc("Part Picking Slip");
					doc.part_order_no = frm.doc.name
					for (let child of frm.doc.table_ugma){
						var row = frappe.model.add_child(
							doc,
							"table_qoik",
						);
						row.part_no = child.part_no;
					}
					frappe.set_route("Form", doc.doctype, doc.name);
				});
			});
		}
	},

	before_save(frm) {
		let total_qty = 0;

		frm.doc.table_ugma.forEach((row) => {
			total_qty += row.qty || 0;
		});

		frm.set_value("total_qty_parts_ordered", total_qty);
		frm.set_value(
			"total_qty_parts_delivered",
			frm.doc.total_delivered_parts_qty || 0,
		);
		frm.set_value(
			"_order_delivered",
			((frm.doc.total_delivered_parts_qty || 0) /
				frm.doc.total_qty_parts_ordered) *
				100,
		);
	},
	total_excl(frm) {
		let total_excl = frm.doc.total_excl;
		let vat = 0.15 * total_excl;
		frm.set_value("vat", vat);
		frm.set_value("total_incl", vat + total_excl);
	},
	part_picking_slip(frm) {
		if (frm.doc.part_picking_slip) {
			frappe.call({
				method: 'frappe.client.get',
				args: {
					doctype: 'Part Picking Slip',
					name: frm.doc.part_picking_slip
				},
				callback(r) {
					if (!r.message) return;

					// Clear existing child table
					frm.clear_table('table_ugma');

					// Copy rows
					(r.message.table_qoik || []).forEach(row => {
						let child = frm.add_child('table_ugma');
						child.part_no = row.part_no;
						child.description = row.description;
						child.qty = row.qty_ordered;
					});

					frm.refresh_field('table_ugma');
				}
        	});
		}else{
			frm.clear_table('table_ugma');
			frm.refresh_field('table_ugma');

		}
	}
});
