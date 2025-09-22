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

frappe.ui.form.on("Security Check", {
	refresh(frm) {
		frm.add_custom_button("Scan", () => {
			// Create a new instance of ZXing's BrowserMultiFormatReader each time the dialog is opened
			let codeReader = new ZXing.BrowserMultiFormatReader();

			// Create a dialog to show the video feed and scanned result
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
					// On dialog close, stop the scanning and clear the video container
					d.hide();
					codeReader.reset();
					d.get_field("camera_feed").$wrapper[0].innerHTML = "";
				},
			});
			d.show();

			// Clear any previous content and insert a fresh video element
			const cameraContainer = d.get_field("camera_feed").$wrapper[0];
			cameraContainer.innerHTML =
				'<video id="video" width="100%" height="300px" autoplay muted></video>';

			// Start decoding from the video stream.
			codeReader.decodeFromVideoDevice(null, "video", (result, err) => {
				if (result) {
					// Barcode detected: extract text
					let scannedText = result.getText();

					// Try to split by "%" for the legacy format
					let segments = scannedText
						.split("%")
						.filter((s) => s.trim() !== "");

					// If segments indicate the legacy (percent-separated) format, use that
					if (segments.length >= 14) {
						let vin = segments[11];
						let colour = segments[10];
						let license_no = segments[5];
						let license_expiry_date = segments[13];
						let engine_no = segments[12];
						let veh_reg_no = segments[6];
						let brand = segments[8];

						frm.set_value("vin_serial_no", vin).then(() => {
							frm.set_value("engine_no", engine_no);
							frm.set_value("colour", colour);
						});
						frm.set_value(
							"vehicle_expiration_date",
							license_expiry_date,
						);
					}
					// ——— 2) AAMVA/ANSI PDF‑417 (SA Driver’s Licence) ——
					else if (
						/^(?:\x1E)?DAA/.test(scannedText) ||
						scannedText.includes("DAQ")
					) {
						const getField = (code) => {
							let re = new RegExp(code + "([^\\r\\n]+)");
							let m = scannedText.match(re);
							return m ? m[1].trim() : "";
						};

						let licenceNo = getField("DAQ");
						let expiryRaw = getField("DBA"); // YYYYMMDD
						let surname = getField("DCS");
						let firstNames = getField("DAC");

						// Format expiry: YYYY‑MM‑DD
						let expiryFormatted = expiryRaw.replace(
							/^(\d{4})(\d{2})(\d{2})$/,
							"$1-$2-$3",
						);

						let driver_fullname = firstNames + " " + surname;

						// Populate licence fields
						frm.set_value("license_number", licenceNo);
						frm.set_value("expiration_date", expiryFormatted);
						frm.set_value("driver_full_names", driver_fullname);
					}
					// ——— 3) Neither format detected ——
					else {
						frappe.msgprint(__("Barcode format not recognized."));
					}
					// Close the dialog and stop scanning immediately upon success
					d.hide();
					codeReader.reset();
					cameraContainer.innerHTML = "";
				}
				// Ignore NotFoundException errors which are expected if no barcode is in view
				if (err && !(err instanceof ZXing.NotFoundException)) {
					console.error(err);
					frappe.msgprint("Scanning error: " + err);
				}
			});
		});
	},

	drivers_license_barcode(frm) {
		if (frm.doc.drivers_license_barcode) {
			frm.call("parse_pdf417_payload", {
				raw_payload: frm.doc.drivers_license_barcode,
			}).then((r) => {
				if (r) {
					console.log(r);
				}
			});
		}
	},

	scan_drivers_license: function (frm) {
		let d = new frappe.ui.Dialog({
			title: "Scan",
			fields: [
				{
					label: "License Data",
					fieldname: "license_data",
					fieldtype: "Small Text",
				},
			],
			primary_action_label: "Close",
			primary_action(values) {
				// On dialog close, stop the scanning and clear the video container
				d.hide();

				// frm.call("decode_sa_dl", {image_path: frm.doc.drivers_license_barcode})
				// .then(r => {
				//     if (r) {
				//         console.log(r);
				//     }
				// });
			},
		});

		d.show();
	},
});
