// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

/* global ZXing */

let codeReader;
let isScanning = false;

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

frappe.ui.form.on("Vehicles Recon", {
	refresh(frm) {
		if (frm.doc.docstatus == 0) {
			frm.add_custom_button(__("Scan"), function () {
				open_qr_scanner(frm);
			});
		}
	},
	onload(frm) {
		if (frm.is_new()) {
			frm.doc.submitted_by = frappe.user.name;
			frappe.call({
				method: "edp_online_vehicles.events.get_recon_vehicles.get_recon_vehicles",
				args: {
					dealer: frm.doc.company,
				},
				callback: function (r) {
					if (r.message) {
						let vinnos = r.message;
						frm.clear_table("stock");

						for (let row of vinnos) {
							frm.add_child("stock", {
								vin_serial_no: row.vin_serial_no,
								model: row.model,
								description: row.description,
								stock_no: row.stock_no,
								engine_no: row.engine_no,
								colour: row.colour,
							});
						}

						frm.refresh_field("stock");
					} else {
						frm.clear_table("stock");
						frm.refresh_field("stock");
					}
				},
			});
		}
	},

	before_save(frm) {
		if (frm.doc.status == "Completed") {
			let checked_rows = 0;

			frm.doc["stock"].forEach(function (row) {
				if (row.in_stock || row.sold) {
					checked_rows += 1;
				}
			});
			console.log(frm.doc.stock.length);

			if (checked_rows < frm.doc.stock.length) {
				frappe.throw(
					"Please note that there is still some vehicles that has not been marked as 'In Stock' or 'Sold' please ensure all vehicles is marked before changing the status to 'Completed'",
				);
			}
		}
	},

	after_save(frm) {
		if (frm.doc.status == "Completed") {
			frappe.call({
				method: "edp_online_vehicles.events.submit_document.submit_stock_recon_document",
				args: {
					doc: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							5,
						);
					}
				},
			});
		}
	},
	company(frm, cdt, cdn) {
		frappe.call({
			method: "edp_online_vehicles.events.set_filters.get_users",
			args: {
				dealer: frm.doc.company,
			},
			callback: function (r) {
				let users = r.message;
			},
		});
	},
});

frappe.ui.form.on("Vehicles Recon Items", {
	in_stock(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.in_stock) {
			if (row.sold) {
				frappe.model.set_value(cdt, cdn, "in_stock", 0);

				frappe.throw("You cannot select both Sold and In Stock");
			}
		}
	},

	sold(frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		if (row.sold) {
			if (row.in_stock) {
				frappe.model.set_value(cdt, cdn, "sold", 0);

				frappe.throw("You cannot select both Sold and In Stock");
			}
		}
	},
});

function open_qr_scanner(frm) {
	if (!codeReader) {
		console.error("ZXing library is not loaded yet.");
		return;
	}
	if (isScanning) {
		console.warn("QR scanning is already active.");
		return;
	}
	isScanning = true;

	// Append the modal if it doesn't exist
	if (!$("#qr-scanner-modal").length) {
		let $popup = $(`
            <div id="qr-scanner-modal" class="modal fade" role="dialog">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4 class="modal-title">Scan QR Code</h4>
                            <button class="popup-close">X</button>
                        </div>
                        <div class="modal-body">
                            <video id="qr-video" width="100%" height="400"
                                style="border: 1px solid black;"
                                playsinline autoplay muted></video>
                        </div>
                    </div>
                </div>
            </div>
            `);

		$(".page-body").append($popup);

		$popup.find(".popup-close").on("click", function () {
			stopScanning();
		});
	}

	$("#qr-scanner-modal").modal("show");

	// Hint to improve canvas performance
	let videoElem = document.getElementById("qr-video");
	if (videoElem) {
		videoElem.setAttribute("willReadFrequently", "true");
	}

	// Start the scanning loop
	scanLoop(frm);
}

function scanLoop(frm) {
	if (!isScanning) return;

	codeReader
		.decodeOnceFromVideoDevice(null, "qr-video")
		.then((result) => {
			if (!isScanning) return;

			// Extract VIN from the URL (assuming it is at the end)
			let url = result.text;
			let vin = url.substring(url.lastIndexOf("/") + 1);
			console.log("Scanned VIN:", vin);

			process_scanned_vin(frm, vin);

			// Wait for 2 seconds before scanning again
			setTimeout(() => {
				scanLoop(frm);
			}, 1000);
		})
		.catch((err) => {
			if (!isScanning) return;

			// Ignore common errors when no QR is in view
			if (
				err &&
				err.message &&
				(err.message.includes("NotFoundException") ||
					err.message.includes("No QR code"))
			) {
				setTimeout(() => {
					scanLoop(frm);
				}, 2000);
			} else {
				console.error(err);
				setTimeout(() => {
					scanLoop(frm);
				}, 2000);
			}
		});
}

function stopScanning() {
	isScanning = false;
	if (codeReader) {
		codeReader.reset();
	}
	$("#qr-scanner-modal").modal("hide");
}

function process_scanned_vin(frm, vin) {
	frappe.call({
		method: "edp_online_vehicles.events.check_equipment_card.check_linked_vinnos",
		args: { vinno: vin },
		callback: function (r) {
			if (r.message) {
				// Check if the VIN is already in the child table "stock"
				let exists =
					frm.doc.stock &&
					frm.doc.stock.some((row) => row.vin_serial_no === vin);
				if (!exists) {
					let child = frm.add_child("stock");
					child.vin_serial_no = vin;
					child.engine_no = r.message.engine_no || "";
					child.description = r.message.description;
					child.model = r.message.model;
					child.colour = r.message.colour;
					child.in_stock = 1;
					frm.refresh_field("stock");

					frappe.show_alert({
						message: "Vehicle successfully added to table",
						indicator: "green",
					});
				} else {
					frappe.show_alert({
						message: "Vehicle already added",
						indicator: "blue",
					});
				}
			} else {
				frappe.show_alert({
					message: "Vehicle not Found",
					indicator: "red",
				});
			}
		},
	});
}
