// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Receipt", {
	refresh(frm) {
		if (
			frm.fields_dict.scan_barcode &&
			frm.fields_dict.scan_barcode.$input
		) {
			setTimeout(function () {
				frm.fields_dict.scan_barcode.$input.focus();
			}, 300);
		}
	},

	scan_barcode(frm) {
		let qty_incremented = false;

		if (frm.doc.scan_barcode) {
			for (let row of frm.doc.items || []) {
				if (row.part_no == frm.doc.scan_barcode) {
					console.log(row.part_no);
					row.qty += 1;
					qty_incremented = true;

					frm.refresh_field("items");

					frm.set_value("scan_barcode", "");
				}
			}

			if (qty_incremented == false) {
				console.log("Item added to table.");

				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles.doctype.part_receipt.part_receipt.check_item",
					args: {
						part_no: frm.doc.scan_barcode,
					},
					callback: function (r) {
						if (r.message) {
							let bin_location = r.message.custom_bin_location;
							let discription = r.message.description;

							frm.add_child("items", {
								bin_location: bin_location,
								part_no: frm.doc.scan_barcode,
								description: discription,
								qty: 1,
							});

							frm.refresh_field("items");

							frm.set_value("scan_barcode", "");
						}
					},
				});
			}
		}
	},
});
