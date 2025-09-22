let enterPressed = false;
let SecurityCount = 0;
frappe.ui.form.on("Delivery Trip", {
	onload(frm) {
		if (frm.is_new()) {
			frm.doc.delivery_stops = [];
			frm.refresh_field("delivery_stops");
		}

		let territory_filter_list = [
			"MP",
			"NW1",
			"NW2",
			"MP1",
			"MASS",
			"PTA/",
			"NW",
			"MP2 DO NOT USE",
			"JHB/",
			"South Africa",
			"All Territories",
			"MP/2",
		];

		frm.set_query("custom_territory", "delivery_stops", function () {
			return {
				filters: [
					["Territory", "name", "not in", territory_filter_list],
				],
			};
		});
	},
	refresh: function (frm, dt, dn) {
		let allDelivered = true;
		let customers = [];

		if (frm.doc.delivery_stops.length > 0) {
			for (let row of frm.doc.delivery_stops) {
				if (!customers.includes(row.customer)) {
					customers.push(row.customer);
				}
			}
		}

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Delivery Note",
				filters: {
					customer: ["in", customers],
					custom_delivery_trip: frm.doc.name,
				},
				fields: ["customer"],
			},
			callback: function (r) {
				let excluded_customers = r.message
					? r.message.map((record) => record.customer)
					: [];

				frm.set_query("custom_customer", () => {
					return {
						filters: {
							name: [
								"in",
								customers.filter(
									(cust) =>
										!excluded_customers.includes(cust),
								),
							],
						},
					};
				});

				if (
					customers.filter(
						(cust) => !excluded_customers.includes(cust),
					).length === 0
				) {
					frm.set_value("custom_status", "Delivered");
					if (!frm.is_dirty()) {
						frm.save();
					}
				}
			},
		});

		frm.doc.delivery_stops.forEach((row) => {
			if (row.custom_delivery_status !== "Delivered") {
				allDelivered = false;
			}
		});
		if (allDelivered) {
			frm.set_value("custom_status", "Delivered");
		}
		frm.fields_dict["delivery_stops"].grid.add_custom_button(
			__("Transfer"),
			function () {
				// Create a new Dialog
				var dialog = new frappe.ui.Dialog({
					title: "Select Delivery Trip",
					fields: [
						{
							fieldtype: "Link",
							label: "Delivery Trip",
							fieldname: "delivery_trip",
							options: "Delivery Trip",
							get_query: function () {
								return {
									filters: {
										docstatus: 0, // This will filter only submitted records
									},
								};
							},
							reqd: 1,
						},
					],
					primary_action_label: "Submit",
					primary_action: function () {
						var values = dialog.get_values();
						var selected_rows =
							frm.fields_dict[
								"delivery_stops"
							].grid.get_selected_children();
						if (selected_rows.length === 0) {
							frappe.msgprint(
								__(
									"Please select at least one row from the Delivery Stops.",
								),
							);
							return;
						}
						frappe.call({
							method: "edp_online_vehicles.events.transfer_invoices.transfer",
							args: {
								dt: values,
								selected_rows: selected_rows,
							},
							callback: (r) => {
								// Remove the transferred rows from the child table
								selected_rows.reverse().forEach((row) => {
									frm.get_field(
										"delivery_stops",
									).grid.grid_rows_by_docname[
										row.name
									].remove();
								});

								frm.refresh_field("delivery_stops"); // Refresh the grid
								frappe.msgprint("Transferred");
								frm.save();
							},
						});
						dialog.hide();
					},
				});

				// Show the Dialog
				dialog.show();
			},
		);
		frm.fields_dict["delivery_stops"].grid.add_custom_button(
			__("Update"),
			function () {
				let total_inv_qty = 0;
				frm.doc.custom_dispatch_list = [];
				for (let row of frm.doc.delivery_stops) {
					frm.add_child("custom_dispatch_list", {
						inv_no: row.custom_inv_no,
						inv_qty: row.custom_inv_qty,
					});
					frm.refresh_field("custom_dispatch_list");
					total_inv_qty += row.custom_inv_qty;
				}
				frm.set_value("custom_total", total_inv_qty);
				frm.set_value("custom_verification_outstanding", total_inv_qty);
			},
		);
		frm.fields_dict["delivery_stops"].grid.grid_buttons
			.find(".btn-custom")
			.removeClass("btn-default")
			.addClass("btn-primary");

		const default_company = frappe.defaults.get_default("company");
		frappe.call({
			method: "edp_online_vehicles.events.company_address.get_company_address",
			args: {
				default_company: default_company,
			},
			callback: (r) => {
				frm.set_value("driver_address", r.message);
				// on success
			},
		});

		frm.add_custom_button(
			__("Invoices"),
			() => {
				let child_row =
					frm.doc.delivery_stops && frm.doc.delivery_stops.length > 0
						? frm.doc.delivery_stops[0]
						: null;
				new frappe.ui.form.MultiSelectDialog({
					doctype: "Sales Invoice",
					target: frm,
					add_filters_group: 1,
					date_field: "posting_date",
					setters: {
						customer: "",
						customer_name: "",
						territory: "",
						custom_delivery_trip_assign: "No",
					},
					// get_query: function() {
					//   return {
					//       filters: {
					//           customer: child_row ? child_row.customer : "",
					//           customer_name: "",
					//           territory: "",
					//           custom_delivery_trip_assign: "No",
					//       }
					//   }
					// },
					action(selections) {
						if (selections && selections.length >= 1) {
							if (frm.doc.delivery_stops.length > 0) {
								if (!frm.doc.delivery_stops[0].custom_inv_no) {
									frm.doc.delivery_stops = [];
								}
							}
							let existing_invoices = frm.doc.delivery_stops.map(
								(stop) => stop.custom_inv_no,
							);
							for (let row of selections) {
								if (existing_invoices.includes(row)) {
									continue; // Skip if the invoice already exists in the child table
								}
								frappe.db
									.get_doc("Sales Invoice", row)
									.then((doc) => {
										console.log(doc);

										let item_row =
											frm.add_child("delivery_stops");
										let fields = {
											custom_inv_no: doc.name,
											customer: doc.customer,
											custom_customer_name:
												doc.customer_name,
											address: doc.customer_address,
											custom_inv_qty: doc.total_qty,
											custom_territory: doc.territory,
											custom_parent_territory:
												doc.custom_parent_territory,
										};

										for (const key in fields) {
											if (
												Object.hasOwnProperty.call(
													fields,
													key,
												)
											) {
												const element = fields[key];
												frappe.model.set_value(
													item_row.doctype,
													item_row.name,
													key,
													element,
												);
											}
										}
										frm.refresh_field("delivery_stops");
									});
							}
						}
						cur_dialog.hide();
					},
				});
			},
			__("Get stops from"),
		);

		if (frm.doc.custom_status == "Out for Delivery") {
			frm.set_df_property("departure_time", "reqd", 1);
		} else {
			frm.set_df_property("departure_time", "reqd", 0);
		}
	},
	custom_update: function (frm) {
		frm.doc.custom_dispatch_list.forEach((row) => {
			frappe.model.set_value(
				row.doctype,
				row.name,
				"checked",
				row.inv_qty,
			);
			row.inv_qty == row.checked;
		});
		frm.refresh_field("custom_dispatch_list");
	},
	custom_update_for_delivery: function (frm) {
		frm.doc.custom_customer_delivery_list.forEach((row) => {
			frappe.model.set_value(
				row.doctype,
				row.name,
				"delivered",
				row.inv_qty,
			);
			row.inv_qty == row.delivered;
		});
		frm.refresh_field("custom_customer_delivery_list");
	},
	custom_delivery_scan_barcode: function (frm) {
		$(frm.wrapper)
			.find(":input")
			.keypress(function (e) {
				if (e.which === 13) {
					// Enter key code
					// field_name = frm.doc.custom_delivery_scan_barcode
					// field_label = "custom_delivery_scan_barcode"
					// child_name = "delivery_stops"
					// scan_barcode(frm, field_name,field_label, child_name);
					scan_barcode(frm);
					e.preventDefault(); // Prevent the default action if needed
				}
			});
	},
	custom_scan_barcode: function (frm) {
		$(frm.wrapper)
			.find(":input")
			.keypress(function (e) {
				if (e.which === 13) {
					// Enter key code
					scan_barcode2(frm);
					e.preventDefault(); // Prevent the default action if needed
				}
			});
	},
	custom_scan_barcode_: function (frm) {
		$(frm.wrapper)
			.find(":input")
			.keypress(function (e) {
				if (e.which === 13) {
					// Enter key code
					scan_barcode3(frm);
					e.preventDefault(); // Prevent the default action if needed
				}
			});
	},
	custom_status(frm) {
		if (frm.doc.custom_status == "Out for Delivery") {
			frm.set_df_property("departure_time", "reqd", 1);
		} else {
			frm.set_df_property("departure_time", "reqd", 0);
		}
	},
	custom_customer(frm, dt, dn) {
		if (frm.doc.custom_customer) {
			frm.set_value("custom_dropshipment_customer", "");
			let total_inv_qty = 0;
			frm.doc.custom_customer_delivery_list = [];
			for (let row of frm.doc.delivery_stops) {
				if (row.customer == frm.doc.custom_customer) {
					frm.add_child("custom_customer_delivery_list", {
						inv_no: row.custom_inv_no,
						inv_qty: row.custom_inv_qty,
						checked_qty: row.custom_checked_qty,
						custom_weight: row.custom_weight,
					});

					if (row.custom_dropshipment_customer) {
						frappe.model.set_value(
							dt,
							dn,
							"custom_dropshipment_customer",
							row.custom_dropshipment_customer,
						);
					}
				}
			}
			frm.refresh_field("custom_customer_delivery_list");
			for (let child of frm.doc.custom_customer_delivery_list) {
				total_inv_qty += child.inv_qty;
			}
			frappe.model.set_value(dt, dn, "custom_total_boxes", total_inv_qty);
			frappe.model.set_value(
				dt,
				dn,
				"custom_outstanding_boxes",
				total_inv_qty,
			);
		}
	},
	custom_security_status(frm) {
		if (frm.doc.custom_security_status == "Completed") {
			if (frm.doc.custom_verification_outstanding != 0) {
				frm.set_value("custom_security_status", "In Progress");
				frappe.throw("Verification Outstanding should be 0");
			}
		}
	},
	custom_customer_delivery_status(frm) {
		if (frm.doc.custom_customer_delivery_status == "Completed") {
			if (frm.doc.custom_outstanding_boxes != 0) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Outstanding Boxes must be 0.");
			}

			if (!frm.doc.custom_received_by) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Received By is mandatory.");
			}

			if (!frm.doc.custom_received_by_signature_) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Signature is mandatory.");
			}
		}

		if (frm.doc.custom_customer_delivery_status == "Delivery Failed") {
			if (frm.doc.custom_outstanding_boxes != 0) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Outstanding Boxes must be 0.");
			}

			if (!frm.doc.custom_received_by) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Received By is mandatory.");
			}

			if (!frm.doc.custom_received_by_signature_) {
				frm.set_value("custom_customer_delivery_status", "In Progress");
				frappe.throw("Signature is mandatory.");
			}
		}
	},
	custom_verification_outstanding(frm) {
		if (frm.doc.custom_verification_outstanding != 0) {
			frm.set_value("custom_security_status", "In Progress");
		}
	},
	custom_outstanding_boxes(frm) {
		if (frm.doc.custom_outstanding_boxes != 0) {
			frm.set_value("custom_customer_delivery_status", "In Progress");
		}
	},
	custom_received_by(frm) {
		if (!frm.doc.custom_received_by) {
			frm.set_value("custom_customer_delivery_status", "In Progress");
		}
	},
	custom_received_by_signature_(frm) {
		if (!frm.doc.custom_received_by_signature_) {
			frm.set_value("custom_customer_delivery_status", "In Progress");
		}
	},
	validate(frm) {
		if (
			frm.doc.custom_security_status == "Completed" &&
			SecurityCount == 0
		) {
			frm.set_value("custom_status", "Out for Delivery");
			SecurityCount++;
			console.log(SecurityCount);
		}
	},
	after_save(frm) {
		if (frm.doc.custom_customer_delivery_status == "Delivery Failed") {
			for (let child of frm.doc.delivery_stops) {
				if (child.customer == frm.doc.custom_customer) {
					frappe.model.set_value(
						child.doctype,
						child.name,
						"details",
						"Delivery Failed",
					);
				}
			}
		}
		if (
			frm.doc.custom_customer_delivery_status == "Delivery Failed" ||
			frm.doc.custom_customer_delivery_status == "Completed"
		) {
			console.log(frm.doc);

			frappe.call({
				method: "edp_online_vehicles.events.create_si.change_sales_status",
				args: {
					trip_doc: frm.doc,
					cds: frm.doc.custom_customer_delivery_status,
				},
				callback: (r) => {
					frappe.msgprint(
						"A Delivery Note has been Created for Customer " +
							frm.doc.custom_customer,
					);

					frm.set_value("custom_customer", "");
					frm.set_value("custom_total_boxes", 0);
					frm.set_value("custom_received_by", "");
					frm.set_value("custom_received_by_signature_", "");
					frm.set_value(
						"custom_customer_delivery_status",
						"In Progress",
					);
					frm.set_value("custom_delivery_remarks", "");
					frm.set_value("custom_image_1", "");
					frm.set_value("custom_image_2", "");
					frm.set_value("custom_image_3", "");
					frm.set_value("custom_dropshipment_customer", "");
					frm.doc.custom_customer_delivery_list = [];
					frm.refresh_field("custom_customer_delivery_list");
					frm.refresh_field("custom_received_by_signature_");
					frm.refresh_field("custom_customer");
					frm.refresh_field("custom_received_by");
					frm.refresh_field("custom_customer_delivery_status");
					frm.refresh_field("custom_delivery_remarks");
					frm.refresh_field("custom_image_1");
					frm.refresh_field("custom_image_2");
					frm.refresh_field("custom_image_3");
					frm.refresh_field("custom_dropshipment_customer");
					frm.dirty();
					frm.save();
				},
			});
		}
	},
});

frappe.ui.form.on("Delivery Stop", {
	custom_delivered_qty: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.custom_inv_qty == row.custom_delivered_qty) {
			frappe.model.set_value(
				cdt,
				cdn,
				"custom_delivery_status",
				"Delivered",
			);
		} else {
			frappe.model.set_value(
				cdt,
				cdn,
				"custom_delivery_status",
				"Not Delivered",
			);
		}
	},
	custom_inv_no(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		for (let child of frm.doc.delivery_stops) {
			if (row.idx != child.idx) {
				if (row.custom_inv_no == child.custom_inv_no) {
					// frappe.model.set_value(row.doctype, row.name, "custom_inv_no" ,"")
					let rowIndex = frm.doc.delivery_stops.findIndex(
						(r) => r.name === row.name,
					);

					// Remove the row from the child table
					frm.doc.delivery_stops.splice(rowIndex, 1);

					// Refresh the child table to reflect the change
					frm.refresh_field("delivery_stops");
					frappe.throw(
						"This invoice already exists on this delivery trip",
					);
				}
			}
		}
	},
});

frappe.ui.form.on("Dispatch List", {
	checked: function (frm, cdt, cdn) {
		checked_calculation(frm, cdt, cdn);
	},
});

frappe.ui.form.on("Customer Delivery List", {
	delivered: function (frm, cdt, cdn) {
		delivered_calculation(frm, cdt, cdn);
	},
	return: function (frm, cdt, cdn) {
		delivered_calculation(frm, cdt, cdn);
	},
});

function scan_barcode(frm) {
	if (frm.doc.custom_delivery_scan_barcode) {
		if (!enterPressed) {
			enterPressed = true;
			frappe.db
				.get_doc("Sales Invoice", frm.doc.custom_delivery_scan_barcode)
				.then((doc) => {
					if (doc.custom_delivery_trip_assign == "No") {
						// Check if the doc.name already exists in the child table
						let exists = false;
						frm.doc.delivery_stops.forEach((row) => {
							if (row.custom_inv_no === doc.name) {
								// Increment the custom_inv_qty by 1
								row.custom_inv_qty += 1;
								exists = true;
								frm.refresh_field("delivery_stops");
							}
						});

						if (!exists) {
							let item_row = frm.add_child("delivery_stops");
							let fields = {
								custom_inv_no: doc.name,
								customer: doc.customer,
								custom_customer_name: doc.customer_name,
								// address: doc.customer_address,
								custom_inv_qty: doc.total_qty,
							};

							for (const key in fields) {
								if (Object.hasOwnProperty.call(fields, key)) {
									const element = fields[key];
									frappe.model.set_value(
										item_row.doctype,
										item_row.name,
										key,
										element,
									);
								}
							}
							frm.refresh_field("delivery_stops");
						}

						frm.set_value("custom_delivery_scan_barcode", "");
					} else {
						frappe.msgprint(
							`Invoice already on another delivery trip <a href="/app/delivery-trip/${doc.custom_delivery_trip_}"> ${doc.custom_delivery_trip_}</a>`,
						);
					}
					enterPressed = false; // Reset the flag
				})
				.catch((error) => {
					console.error(error);
					enterPressed = false; // Reset the flag in case of an error
				});
		}
	}
}

function scan_barcode2(frm) {
	if (frm.doc.custom_scan_barcode) {
		if (!enterPressed) {
			enterPressed = true;
			frappe.db
				.get_doc("Sales Invoice", frm.doc.custom_scan_barcode)
				.then((doc) => {
					frm.doc.custom_dispatch_list.forEach((row) => {
						if (row.inv_no === doc.name) {
							frappe.model.set_value(
								row.doctype,
								row.name,
								row.checked,
								(row.checked += 1),
							);
							checked_calculation(frm, row.doctype, row.name);
							frm.refresh_field("custom_dispatch_list");
						}
					});
					frm.set_value("custom_scan_barcode", "");
					enterPressed = false; // Reset the flag
				})
				.catch((error) => {
					console.error(error);
					frm.set_value("custom_scan_barcode", "");
					enterPressed = false; // Reset the flag in case of an error
				});
		}
	}
}

function scan_barcode3(frm) {
	if (frm.doc.custom_scan_barcode_) {
		if (!enterPressed) {
			enterPressed = true;
			frappe.db
				.get_doc("Sales Invoice", frm.doc.custom_scan_barcode_)
				.then((doc) => {
					frm.doc.custom_customer_delivery_list.forEach((row) => {
						if (row.inv_no === doc.name) {
							frappe.model.set_value(
								row.doctype,
								row.name,
								row.delivered,
								(row.delivered += 1),
							);
							delivered_calculation(frm, row.doctype, row.name);
							frm.refresh_field("custom_customer_delivery_list");
						}
					});
					frm.set_value("custom_scan_barcode_", "");
					enterPressed = false; // Reset the flag
				})
				.catch((error) => {
					console.error(error);
					frm.set_value("custom_scan_barcode_", "");
					enterPressed = false; // Reset the flag in case of an error
				});
		}
	}
}

function checked_calculation(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	for (let child of frm.doc.delivery_stops) {
		if (row.inv_no == child.custom_inv_no) {
			frappe.model.set_value(
				child.doctype,
				child.name,
				"custom_checked_qty",
				row.checked,
			);
		}
	}
	let total_checked_qty = 0;
	for (let child of frm.doc.custom_dispatch_list) {
		if (child.checked > child.inv_qty) {
			frappe.model.set_value(
				child.doctype,
				child.name,
				"checked",
				child.inv_qty,
			);
			frappe.msgprint(
				"Checked Quantity can not be greater than Invoice Quantity",
			);
		}
		total_checked_qty += child.checked;
	}
	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		"custom_verification_outstanding",
		frm.doc.custom_total - total_checked_qty,
	);
}

function delivered_calculation(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	for (let child of frm.doc.delivery_stops) {
		if (row.inv_no == child.custom_inv_no) {
			frappe.model.set_value(
				child.doctype,
				child.name,
				"custom_delivered_qty",
				row.delivered,
			);
			frappe.model.set_value(
				child.doctype,
				child.name,
				"custom_return_",
				row.return,
			);
			frappe.model.set_value(
				child.doctype,
				child.name,
				"details",
				row.custom_details,
			);
		}
	}
	let total_delivered_qty = 0;
	let total_return_qty = 0;
	for (let child of frm.doc.custom_customer_delivery_list) {
		if (child.delivered > child.inv_qty) {
			frappe.model.set_value(
				child.doctype,
				child.name,
				"delivered",
				child.inv_qty,
			);
			frappe.msgprint(
				"Delivered Quantity can not be greater than Invoice Quantity",
			);
		}
		total_delivered_qty += child.delivered;
		total_return_qty += child.return;
	}
	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		"custom_outstanding_boxes",
		frm.doc.custom_total_boxes - total_delivered_qty - total_return_qty,
	);
}
