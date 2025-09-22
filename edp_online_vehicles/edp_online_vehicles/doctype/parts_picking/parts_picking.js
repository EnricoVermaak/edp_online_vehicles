// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

/* global ZXing */

let codeReader;

// Preload ZXing library and initialize the reader on page load
$(document).ready(function () {
	frappe.require(
		"https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js",
		function () {
			codeReader = new ZXing.BrowserMultiFormatReader();
			console.log("ZXing library loaded");
		},
	);
});

frappe.ui.form.on("Parts Picking", {
	refresh: function (frm) {
		// Only execute if the specified fields in the parent form are empty
		if (
			!frm.doc.bin_location &&
			!frm.doc.part_no &&
			!frm.doc.description &&
			!frm.doc.qty_ordered
		) {
			// Make sure the child table 'parts_ordered' exists and has rows
			if (frm.doc.parts_ordered && frm.doc.parts_ordered.length > 0) {
				if (!frm.doc.last_part_idx || frm.doc.last_part_idx === 0) {
					// Use the first row
					let row = frm.doc.parts_ordered[0];
					frm.set_value("bin_location", row.bin_location);
					frm.set_value("part_no", row.part_no);
					frm.set_value("description", row.description);
					frm.set_value("qty_ordered", row.qty);
					frm.set_value("last_part_idx", 0);
				} else {
					// Use last_part_idx, increment it by 1 to get the next part row
					let last_idx = parseInt(frm.doc.last_part_idx, 10);
					let next_idx = last_idx + 1;

					// Check if the next index is available in the parts_ordered table
					if (next_idx < frm.doc.parts_ordered.length) {
						let row = frm.doc.parts_ordered[next_idx];
						frm.set_value("bin_location", row.bin_location);
						frm.set_value("part_no", row.part_no);
						frm.set_value("description", row.description);
						frm.set_value("qty_ordered", row.qty);
						frm.set_value("last_part_idx", next_idx);
					}
				}
			}
		}

		if (frm.fields_dict.scan && frm.fields_dict.scan.$input) {
			frm.fields_dict.scan.$input.off("keydown");
			frm.fields_dict.scan.$input.on("keydown", function (e) {
				if (e.keyCode === 13) {
					e.preventDefault();
					return false;
				}
			});
		}
	},

	scan: function (frm) {
		open_scan_dialog(frm);
	},

	qty_picked: function (frm) {
		if (frm.doc.qty_picked && frm.doc.qty_picked > 0) {
			if (frm.doc.qty_picked != frm.doc.qty_ordered) {
				frappe.msgprint(
					"Please be aware. Qty Picked does not match Qty Ordered",
				);
			}
		}
	},

	part_picked: function (frm) {
		let pick_flag = true;

		if (
			frm.doc.scanned_bin_location &&
			frm.doc.scanned_part_no &&
			frm.doc.qty_picked > 0
		) {
			for (let row of frm.doc.parts_picked || []) {
				if (row.part_no === frm.doc.scanned_part_no) {
					pick_flag = false;

					frappe.show_alert(
						{
							message: "Item already picked",
							indicator: "red",
						},
						6,
					);

					break;
				}
			}

			if (pick_flag) {
				frm.add_child("parts_picked", {
					bin_location: frm.doc.scanned_bin_location,
					part_no: frm.doc.scanned_part_no,
					description: frm.doc.description,
					qty: frm.doc.qty_picked,
				});

				frm.refresh_field("parts_picked");

				let last_idx = parseInt(frm.doc.last_part_idx, 10);
				let next_idx = last_idx + 1;

				// Check if the next index is available in the parts_ordered table
				if (next_idx < frm.doc.parts_ordered.length) {
					let row = frm.doc.parts_ordered[next_idx];
					frm.set_value("bin_location", row.bin_location);
					frm.set_value("part_no", row.part_no);
					frm.set_value("description", row.description);
					frm.set_value("qty_ordered", row.qty);
					frm.set_value("last_part_idx", next_idx);
				}

				frm.set_value("scanned_bin_location", "");
				frm.set_value("scanned_part_no", "");
				frm.set_value("qty_picked", 0);

				frm.save();
			} else {
				frm.set_value("scanned_bin_location", "");
				frm.set_value("scanned_part_no", "");
				frm.set_value("qty_picked", 0);
			}
		}
	},

	scanned_part_no: function (frm) {
		if (frm.doc.scanned_part_no) {
			frappe.call({
				method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.doctype.parts_picking.parts_picking.check_item",
				args: {
					part_no: frm.doc.scanned_part_no,
				},
				callback: function (r) {
					if (r.message) {
						if (frm.doc.scanned_part_no != frm.doc.part_no) {
							frm.set_value("scanned_part_no", "");
							frm.set_value("scanned_bin_location", "");
							frm.set_value("qty_picked", 0);

							frappe.show_alert(
								{
									message: "Wrong part picked",
									indicator: "red",
								},
								6,
							);
						} else {
							frm.set_value("scanned_bin_location", r.message);
							frm.set_value("qty_picked", 1);

							frappe.show_alert(
								{
									message: "Part Successfully scanned",
									indicator: "green",
								},
								6,
							);
						}
					}
				},
			});
		}
	},
});

function open_scan_dialog(frm) {
	let codeReader = new ZXing.BrowserMultiFormatReader();
	let d = new frappe.ui.Dialog({
		title: "Scan",
		fields: [
			{
				label: "Camera Feed",
				fieldname: "camera_feed",
				fieldtype: "HTML",
			},
		],
		primary_action_label: "Close",
		primary_action() {
			d.hide();
			codeReader.reset();
			d.get_field("camera_feed").$wrapper[0].innerHTML = "";
		},
	});
	d.show();
	const cameraContainer = d.get_field("camera_feed").$wrapper[0];
	cameraContainer.innerHTML =
		'<video id="video" width="100%" height="300px" autoplay muted></video>';
	codeReader.decodeFromVideoDevice(null, "video", (result, err) => {
		if (result) {
			let scannedText = result.getText();
			if (scannedText) {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.doctype.parts_picking.parts_picking.check_item",
					args: { part_no: scannedText },
					callback: function (r) {
						if (r.message) {
							frm.set_value("scanned_bin_location", r.message);
							frm.set_value("scanned_part_no", scannedText);
						} else {
							frappe.msgprint(
								"Scanned part does not exist on the system.",
							);
						}
					},
				});
			}
			d.hide();
			codeReader.reset();
			cameraContainer.innerHTML = "";
		}
		// Ignore NotFoundExceptions - common when no barcode is present
		if (err && !(err instanceof ZXing.NotFoundException)) {
			console.error(err);
			frappe.msgprint("Scanning error: " + err);
		}
	});
}
