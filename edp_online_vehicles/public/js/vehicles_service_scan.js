frappe.provide("edp_online_vehicles.vehicles_service");

edp_online_vehicles.vehicles_service.add_scan_button = function (frm) {
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
					let vin = segments[11]; // per your current logic

					frappe.call({
						method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
						args: { vinno: vin },
						callback: function (r) {
							if (r.message) {
								let colour = segments[10];
								let license_no = segments[5];
								let license_expiry_date = segments[13];
								let engine_no = segments[12];
								let veh_reg_no = segments[6];
								let brand = segments[8];
								frm.set_value("vin_serial_no", vin).then(
									() => {
										frm.set_value(
											"engine_no",
											engine_no,
										);
										frm.set_value("colour", colour);
										frm.set_value("brand", brand);
									},
								);
								frm.set_value("licence_no", license_no);
								frm.set_value(
									"licence_expiry_date",
									license_expiry_date,
								);
								frm.set_value(
									"vehicle_registration_number",
									veh_reg_no,
								);
							} else {
								frappe.db
									.get_value(
										"Company",
										{ name: frm.doc.dealer },
										"custom_allow_any_brand_for_dealership",
									)
									.then((res) => {
										if (
											res.message
												.custom_allow_any_brand_for_dealership
										) {
											frappe.call({
												method: "edp_online_vehicles.events.service_methods.create_vehicle",
												args: {
													vinno: vin,
													colour: segments[10],
													license_no: segments[5],
													license_expiry_date:
														segments[13],
													engine_no: segments[12],
													veh_reg_no: segments[6],
													brand: segments[8],
												},
												callback: function (r) {
													if (r.message) {
														frappe.show_alert(
															{
																message: __(
																	"Vehicle successfully created",
																),
																indicator:
																	"green",
															},
															20,
														);
													} else {
														frappe.show_alert(
															{
																message: __(
																	"Failed to create Vehicle. Please contact support: support@tecwise.co.za",
																),
																indicator:
																	"red",
															},
															20,
														);
													}
												},
											});
										} else {
											frappe.show_alert(
												{
													message: __(
														"The scanned Vehicle does not exist on the system. Please contact head office and ask them to load the vehicle on the system.",
													),
													indicator: "orange",
												},
												15,
											);
										}
									});
							}
						},
					});
				}
				// Otherwise, check if the scanned text is a URL
				else {
					try {
						let urlObj = new URL(scannedText);
						// Extract the last segment of the pathname
						let pathSegments = urlObj.pathname
							.split("/")
							.filter((s) => s !== "");
						if (pathSegments.length > 0) {
							let vin = pathSegments[pathSegments.length - 1];
							frappe.call({
								method: "edp_online_vehicles.events.check_vinno.check_service_vinno",
								args: { vinno: vin },
								callback: function (r) {
									if (r.message) {
										frm.set_value("vin_serial_no", vin);
									} else {
										console.log(vin);

										frappe.show_alert(
											{
												message: __(
													"Vin/Serial No not on system. Please contact Head Office.",
												),
												indicator: "red",
											},
											20,
										);
									}
								},
							});
						} else {
							frappe.msgprint("Vin/Serial No not recognised");
						}
					} catch (e) {
						frappe.msgprint("Barcode format not recognized.");
					}
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
};

