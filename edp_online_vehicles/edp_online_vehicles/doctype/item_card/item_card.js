// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Item Card", {
	refresh(frm) {},
	item: function (frm) {
		if (frm.doc.item) {
			frm.doc.table_inpt = [];
			frappe.db.get_doc("Item", frm.doc.item).then((doc) => {
				for (let row of doc.custom_specfications) {
					frm.add_child("table_inpt", {
						description: row.description,
						value: row.value,
					});
					frm.refresh_field("table_inpt");
				}
			});

			frm.set_value("status", "Linked");
		} else {
			frm.set_value("status", "Unlinked");

			frm.doc.table_inpt = [];
			frm.refresh_field("table_inpt");
		}
	},
});
