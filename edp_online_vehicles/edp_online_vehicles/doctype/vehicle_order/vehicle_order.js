// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Order", {
	onload: function (frm) {
		if (!frm.is_new()) return;

		frm.call("generate_dealer_reference_number").then(r => {
			if (r.message) {
				frm.set_value("dealer_order_no", r.message);
			}
		});

		if (frm.is_new()) {

			frappe.call({
				method: "edp_online_vehicles.events.get_warehouse_data.get_company_address",
				args: {
					company: frm.doc.dealer,
				},
				callback: function (r) {
					// Only proceed if r.message contains data
					if (r.message && r.message.length > 0) {
						let address_line1 = r.message[0].address_line1;
						let city = r.message[0].city;
						let country = r.message[0].country;
						let postal_code = r.message[0].pincode;

						const address = `${address_line1}\n${city}\n${country}\n${postal_code}`;

						frm.set_value("delivery_location", address);
						frm.refresh_field("delivery_location");
					} else {
						frm.set_value(
							"delivery_location",
							"No Shipping Address linked to Company",
						);
						frm.refresh_field("delivery_location");
					}
				},
			});
			// Initialize the HTML table for floorplan options
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Company",
					name: frm.doc.dealer,
				},
				callback: function (r) {
					if (r.message) {
						let company_data = r.message;

						// Create an HTML table from the child table data
						let table_html =
							'<table class="table table-bordered"><thead><tr><th>Bank</th><th>Available Balance</th><th>Order Total</th><th>Balance After Placing Order</th></tr></thead><tbody>';

						(company_data.custom_floorplan_options || []).forEach(
							function (row) {
								table_html += `<tr id="row-${row.bank.replace(/\s+/g, "_")}">
								<td>${row.bank}</td>
								<td>${row.balance}</td>
								<td class="total-field">0</td>
								<td class="remaining-field">0</td>
							</tr>`;
							},
						);

						table_html += "</tbody></table>";
						frm.fields_dict.floorplan_table.$wrapper.html(
							table_html,
						);
					}
				},
			});

			frm.doc.mandatory_documents = [];

			// Fetch settings and populate child tables
			frappe.db.get_doc("Vehicle Stock Settings").then((doc) => {
				for (let man_row of doc.mandetory_documents) {
					frm.add_child("mandatory_documents", {
						document_name: man_row.document_name,
					});
				}
				frm.refresh_field("mandatory_documents");
			});

			frappe.db
				.get_single_value(
					"Vehicle Stock Settings",
					"default_turn_around_time_on_orders",
				)
				.then((days) => {
					if (days > 0) {
						let today = new Date();
						let resultDate = new Date(today);

						resultDate.setDate(resultDate.getDate() + days);

						// Convert Date object to YYYY-MM-DD format for Date field
						let dateString = resultDate.getFullYear() + '-' +
							String(resultDate.getMonth() + 1).padStart(2, '0') + '-' +
							String(resultDate.getDate()).padStart(2, '0');

						frm.set_value("requested_delivery_date", dateString);
					} else {
						let today = new Date();
						let resultDate = new Date(today);

						resultDate.setDate(resultDate.getDate() + 30);

						// Convert Date object to YYYY-MM-DD format for Date field
						let dateString = resultDate.getFullYear() + '-' +
							String(resultDate.getMonth() + 1).padStart(2, '0') + '-' +
							String(resultDate.getDate()).padStart(2, '0');

						frm.set_value("requested_delivery_date", dateString);
					}
				});
		} else {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Company",
					name: frm.doc.dealer,
				},
				callback: function (r) {
					if (r.message) {
						let company_data = r.message;

						// Create an HTML table from the child table data
						let table_html =
							'<table class="table table-bordered"><thead><tr><th>Bank</th><th>Available Balance</th><th>Order Total</th><th>Balance After Placing Order</th></tr></thead><tbody>';

						(company_data.custom_floorplan_options || []).forEach(
							function (row) {
								table_html += `<tr id="row-${row.bank.replace(/\s+/g, "_")}">
								<td>${row.bank}</td>
								<td>${row.balance}</td>
								<td class="total-field">0</td>
								<td class="remaining-field">0</td>
							</tr>`;
							},
						);

						table_html += "</tbody></table>";
						frm.fields_dict.floorplan_table.$wrapper.html(
							table_html,
						);
					}
				},
			});
		}

		frappe.call({
			method: "edp_online_vehicles.events.get_active_dealers.get_active_dealers",
			callback: function (r) {
				if (r.message) {
					let companies = r.message.map((c) => c.name);

					companies.sort((a, b) => a.localeCompare(b));

					let field = frm.fields_dict.deliver_to_dealer;
					field.df.options = companies.join("\n");
					field.refresh();
					frm.set_value("deliver_to_dealer", frm.doc.dealer);
				}
			},
		});

		let data = localStorage.getItem("vehicle_order_model_data");
		if (frm.doc.__islocal && data) {
			try {
				let { model_code, model_description } = JSON.parse(data);

				frm.doc.vehicles_basket = [];

				// Add a new child row to vehicles_basket
				let child = frappe.model.add_child(frm.doc, "vehicles_basket");
				child.model = model_code;
				child.description = model_description;
				child.status = "Pending";

				// Refresh the child table to reflect the new row
				frm.refresh_field("vehicles_basket");

				if (
					frm.fields_dict["vehicles_basket"] &&
					frm.fields_dict["vehicles_basket"].grid
				) {
					let grid = frm.fields_dict["vehicles_basket"].grid;
					if (grid && grid.grid_rows && grid.grid_rows.length) {
						// Define the async process
						const processBasketSync = async () => {
							frm._processing_basket = true;
							for (let grid_row of grid.grid_rows) {
								if (!grid_row.doc || !grid_row.doc.model) continue;
								let row = grid_row.doc;

								try {
									let cdt = row.doctype;
									let cdn = row.name;
									check_and_update_order_type(frm, cdt, cdn)
								} catch (err) {
									console.error("Error in basket processing for row", row.name, err);
								}
							}
							frm._processing_basket = false;
							// Refresh once at the very end
							frm.refresh_field("vehicles_basket");
						};
						// Execute
						processBasketSync();
					}

				}
			} catch (e) {
				console.error("Error parsing vehicle_order_model_data", e);
			}
			// Clear the storage to prevent re-using the data
			localStorage.removeItem("vehicle_order_model_data");
		}

		frappe.db.get_single_value("Vehicle Stock Settings", "allow_scheduled_orders")
			.then((allow_scheduled_orders) => {
				if (allow_scheduled_orders === 0) {
					// Ensure value exists
					if (!frm.doc.order_date_time) {
						frm.set_value("order_date_time", frappe.datetime.now_datetime());
					}
					// Set read-only without refresh
					frm.set_df_property("order_date_time", "read_only", 1);
				}
			});
	},

	finance_option(frm) {
		if (frm.doc.finance_option == "Floorplan") {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Vehicle Stock Settings",
					filters: {},
					fieldname: "display_floorplan",
				},
				callback: function (response) {
					if (response.message.display_floorplan === "1") {
						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Company",
								name: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let company_data = r.message;

									// Create an HTML table from the child table data
									let table_html =
										'<table class="table table-bordered"><thead><tr><th>Bank</th><th>Available Balance</th><th>Order Total</th><th>Balance After Placing Order</th></tr></thead><tbody>';

									(
										company_data.custom_floorplan_options ||
										[]
									).forEach(function (row) {
										table_html += `<tr id="row-${row.bank.replace(
											/\s+/g,
											"_",
										)}">
											<td>${row.bank}</td>
											<td>${row.balance}</td>
											<td class="total-field">0</td>
											<td class="remaining-field">0</td>
										</tr>`;
									});

									table_html += "</tbody></table>";
									frm.fields_dict.floorplan_table.$wrapper.html(
										table_html,
									);
								}
							},
						});

						frm.toggle_display("floorplan_table", true);

						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Company",
								name: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let floorplan_data = r.message;
									let bank_options = [];

									(
										floorplan_data.custom_floorplan_options ||
										[]
									).forEach(function (floorplan_row) {
										bank_options.push({
											label: floorplan_row.bank,
											value: floorplan_row.bank,
										});
									});

									// Set the bank options in the floorplan select field
									let field = frm.fields_dict.floorplan;
									field.df.options = bank_options
										.map((option) => option.value)
										.join("\n");
									field.refresh();
								}
							},
						});
					}
				},
			});
		} else {
			frm.toggle_display("floorplan_table", false);
		}
	},

	floorplan: function (frm) {
		if (frm.doc.finance_option === "Floorplan" && frm.doc.total_excl) {
			let selected_bank = frm.doc.floorplan.replace(/\s+/g, "_");
			let total_excl = frm.doc.total_excl;

			// Clear previous calculations in the table
			$("table tbody tr").each(function () {
				$(this).find(".total-field").text("0");
				$(this)
					.find(".remaining-field")
					.text("0")
					.css("color", "black");
			});

			// Fetch company data to get floorplan options
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Company",
					name: frm.doc.dealer,
				},
				callback: function (r) {
					if (r.message) {
						let company_data = r.message;

						// Update only the selected bank's row in the table
						(company_data.custom_floorplan_options || []).forEach(
							function (row) {
								if (
									row.bank.replace(/\s+/g, "_") ===
									selected_bank
								) {
									let remaining_value =
										row.balance - total_excl;

									// Update the table for the selected bank
									let remaining_cell = $(
										`#row-${row.bank.replace(/\s+/g, "_")} .remaining-field`,
									);
									let total_cell = $(
										`#row-${row.bank.replace(/\s+/g, "_")} .total-field`,
									);

									total_cell.text(total_excl);
									remaining_cell.text(remaining_value);

									// Apply red or green color based on the result
									if (remaining_value <= 0) {
										remaining_cell.css("color", "red");
									} else {
										remaining_cell.css("color", "green");
									}
								}
							},
						);
					}
				},
			});
		}
	},

	total_excl(frm) {
		// Trigger the floorplan calculation when total_excl changes
		if (frm.doc.finance_option === "Floorplan") {
			frm.events.floorplan(frm);
		}
	},

	dealer: function (frm) {
		if (frm._processing_basket) return;

		if (frm.doc.dealer) {
			frappe.call({
				method: "edp_online_vehicles.events.get_warehouse_data.get_company_address",
				args: {
					company: frm.doc.dealer,
				},
				callback: function (r) {
					// Only proceed if r.message contains data
					if (r.message && r.message.length > 0) {
						let address_line1 = r.message[0].address_line1;
						let city = r.message[0].city;
						let country = r.message[0].country;

						const address = `${address_line1}\n${city}\n${country}`;

						frm.set_value("delivery_location", address);
						frm.refresh_field("delivery_location");
					} else {
						frm.set_value(
							"delivery_location",
							"No Shipping Address linked to Company",
						);
						frm.refresh_field("delivery_location");
					}
				},
			});
			frm.set_value("deliver_to_dealer", frm.doc.dealer);

			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Company",
					name: frm.doc.dealer,
				},
				callback: function (r) {
					if (r.message) {
						let floorplan_data = r.message;
						let bank_options = [];

						(floorplan_data.custom_floorplan_options || []).forEach(
							function (floorplan_row) {
								bank_options.push({
									label: floorplan_row.bank,
									value: floorplan_row.bank,
								});
							},
						);

						// Set the bank options in the floorplan select field
						let field = frm.fields_dict.floorplan;
						field.df.options = bank_options
							.map((option) => option.value)
							.join("\n");
						field.refresh();
					}
				},
			});
		}
	},
	refresh(frm) {
		// 1. Check if we are already processing or if the form is still loading
		if (frm._processing_basket || frm.loading) return;

		const rows_to_update = (frm.doc.vehicles_basket || []).filter(row => row.model && !row.colour);

		if (rows_to_update.length > 0) {
			Promise.all(rows_to_update.map(row => {
				return frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_order.vehicle_order.get_default_model_colour",
					args: { model: row.model },
				}).then(r => {
					if (r.message) {
						frappe.model.set_value(row.doctype, row.name, "colour", r.message);
					}
				});
			})).then(() => {
				frm.refresh_field("vehicles_basket");
			});
		}

		// ... (rest of your existing set_query and button logic)
		frm.set_query("colour", "vehicles_basket", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];
			return { filters: { model: d.model, discontinued: 0 } };
		});
		frm.set_query("colour", "vehicles_basket", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];
			return {
				filters: {
					model: d.model,
					discontinued: 0,
				},
			};
		});

		frm.set_query("model", "vehicles_basket", function (doc, cdt, cdn) {
			let d = locals[cdt][cdn];
			return {
				filters: {
					mark_as_discontinued: 0,
				},
			};
		});

		// ADDED / CORRECTED
		if (frm.doc.docstatus === 1) {
			// 1. Disable row addition via Frappe API (Safe & Error-free)
			if (frm.fields_dict["vehicles_basket"]) {
				frm.fields_dict["vehicles_basket"].grid.cannot_add_rows = true;
			}

			// 2. Hide UI buttons via CSS (Modern method to avoid console errors)
			frappe.dom.set_style(`
				.grid-insert-row-below, 
				.grid-append-row,
				.grid-insert-row {
					display: none !important;
				}
			`);
		}


		frm.fields_dict["vehicles_basket"].grid.add_custom_button(
			"Add Multiple",
			() => {
				open_add_multiple_dialog(frm);
			},
		);

		frm.fields_dict["mandatory_documents"].grid.wrapper
			.find(".grid-remove-rows")
			.hide();
		frm.get_field("mandatory_documents").grid.cannot_add_rows = true;

		frm.refresh_field("mandatory_documents");


		$(document).on("click", ".btn-clear", function (e) {
			let cdn = $(this).closest(".grid-row").attr("data-name");

			if (!cdn) {
				console.warn("No docname found on the closest .grid-row");
				return;
			}

			// Retrieve the grid and the specific row based on its docname.
			let grid = frm.fields_dict["vehicles_basket"].grid;
			let grid_row = grid.grid_rows.find((r) => r.doc.name === cdn);

			// If the grid row and its model field exist, remove the popover.
			if (grid_row && grid_row.columns && grid_row.columns.model) {
				const $modelField = grid_row.columns.model;
				if ($modelField.data("bs.popover")) {
					$modelField.popover("dispose");
					$modelField.removeAttr("data-content");
				}
			}
		});
	},

	validate(frm) {
		if (frm._skip_stock_dialog) {
			frm._skip_stock_dialog = false;
			return;
		}

		// Track previous order_from
		frm._prev_order_from = frm._prev_order_from || {};
		frm.doc.vehicles_basket.forEach((row) => {
			if (frm._prev_order_from[row.idx] === undefined) {
				frm._prev_order_from[row.idx] = row.order_from;
			}
		});

		// Missing dealer check
		let missing = frm.doc.vehicles_basket
			.filter((r) => !r.dealer)
			.map((r) => `Row ${r.idx}: Model ${r.model || "N/A"}`);
		if (missing.length) {
			frappe.msgprint({
				title: __("Missing Dealer in Rows"),
				message: __(
					"The following rows do not have a dealer selected:<br/><b>{0}</b>",
					[missing.join("<br>")],
				),
				indicator: "orange",
			});
			frappe.validated = false;
			return;
		}

		// Colour check
		frm.doc.vehicles_basket.forEach((row) => {
			if (!row.colour)
				frappe.throw(
					__(
						"Each ordered vehicle must have a Colour assigned (Row {0})",
						[row.idx],
					),
				);
		});

		// Group by model|colour
		let groups = {};
		frm.doc.vehicles_basket.forEach((row) => {
			let key = `${row.model}|${row.colour}`;
			groups[key] = groups[key] || {
				model: row.model,
				description: row.description,
				colour: row.colour,
				rows: [],
			};
			groups[key].rows.push(row);
		});
		if (!Object.keys(groups).length) {
			frappe.validated = true;
			return;
		}

		frappe.validated = false;

		const summaryRows = Object.values(groups)
			.map(
				(g) => `
				<tr>
					<td>${g.model}</td>
					<td>${g.description}</td>
					<td>${g.colour}</td>
					<td>${g.rows.length}</td>
				</tr>
			`,
			)
			.join("");

		const vehicleRows = frm.doc.vehicles_basket
			.map((row) => {
				const prev = frm._prev_order_from?.[row.idx];
				const curr = row.order_from;
				const danger =
					prev === "Warehouse" && curr === "Back Order"
						? "text-danger"
						: "";

				return `
				<tr class="${danger}">
					<td>${row.model || ""}</td>
					<td>${row.description || ""}</td>
					<td>${row.colour || ""}</td>
					<td>${row.purpose || ""}</td>
					<td>${row.order_from || ""}</td>
				</tr>
			`;
			})
			.join("");

		frappe.db
			.get_doc("Company", frm.doc.dealer)
			.then((comp_doc) => {
				const comp_code = comp_doc.custom_customer_code || "";
				const comp_name = frm.doc.dealer || "";

				const html = `
				<h4>${__("Dealer Details")}</h4>
				<p>
					${__("Dealer Name")}: ${comp_name}<br>
					${__("Customer Code")}: ${comp_code}
				</p>

				<br>

				<h4>${__("Summary")}</h4>
				<table class="table table-bordered mb-4">
					<thead>
						<tr>
							<th>${__("Model")}</th>
							<th>${__("Description")}</th>
							<th>${__("Colour")}</th>
							<th>${__("Qty")}</th>
						</tr>
					</thead>
					<tbody>${summaryRows}</tbody>
				</table>

				<h4>${__("Vehicles")}</h4>
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>${__("Model")}</th>
							<th>${__("Description")}</th>
							<th>${__("Colour")}</th>
							<th>${__("Purpose")}</th>
							<th>${__("Order From")}</th>
						</tr>
					</thead>
					<tbody>${vehicleRows}</tbody>
				</table>
			`;

				const dlg = new frappe.ui.Dialog({
					size: "extra-large",
					title: __("Confirm Vehicle Order"),
					fields: [{ fieldtype: "HTML", fieldname: "tab_html" }],
					primary_action_label: __("Confirm"),
					primary_action() {
						frappe.validated = true;
						dlg.hide();
						frm._skip_stock_dialog = true;

						if (frm.is_new() || frm.is_dirty()) {
							frm.save();
						} else {
							frm.save("Submit");
						}
					},
					secondary_action_label: __("Cancel"),
					secondary_action() {
						dlg.hide();
					},
				});

				dlg.fields_dict.tab_html.$wrapper.html(html);
				dlg.show();
			})
			.catch(() => {
				frappe.msgprint({
					title: __("Error"),
					message: __("Could not load dealer details."),
					indicator: "red",
				});
			});

	},

	after_save: function (frm) {
		let now = frappe.datetime.now_datetime();

		// Ensure order_date_time exists before comparing
		if (frm.doc.order_date_time && frm.doc.order_date_time <= now) {
			check_if_document_exists(frm.doc.name).then((exists) => {
				if (exists) {
					frappe.db
						.get_single_value(
							"Vehicle Stock Settings",
							"automatically_submit_main_equipment_order_document",
						)
						.then((submit) => {
							if (submit) {
								frappe.call({
									method: "edp_online_vehicles.events.submit_document.submit_order_document",
									args: {
										doc: frm.doc.name,
									},
									freeze: true,
									freeze_message: "Submitting Order in Background...",
									callback: function (r) {
										if (r.message) {
											frappe.show_alert(
												{
													message: r.message,
												},
												30,
											);

											// run_order_creation(frm);
										}
									},
								});
							}
						});
				} else {
					wait_for_document_creation(frm);
				}
			});
		}
	},
	onload_post_render: function (frm) {
		// Hide help text
		$("p.help-box.small.text-muted").hide();

		frappe.db.get_single_value("Vehicle Stock Settings", "allow_scheduled_orders")
			.then((allow_scheduled_orders) => {

				// 1. Only set the current date/time if the form is NEW
				if (frm.is_new() && !frm.doc.order_date_time) {
					// Set value without a full refresh
					frm.doc.order_date_time = frappe.datetime.now_datetime();
				}

				// 2. Target the field directly
				let field = frm.fields_dict['order_date_time'];
				if (field && field.datepicker) {
					let dp = field.datepicker;
					let today = new Date(frappe.datetime.get_today());

					// Update datepicker constraints
					dp.update({
						minDate: allow_scheduled_orders === 1 ? today : null,
						maxDate: allow_scheduled_orders === 0 ? today : null
					});

					// 3. Sync the visual input with the value
					if (frm.doc.order_date_time) {
						// This updates the calendar internal state
						dp.selectDate(new Date(frm.doc.order_date_time));
						// This updates the actual text box without redrawing the whole field
						field.set_input(frm.doc.order_date_time);
					}
				}
				// DO NOT use frm.refresh_field here, as it removes the description
			});

		// Initialize grid rows for vehicles basket
		if (frm.fields_dict["vehicles_basket"] && frm.fields_dict["vehicles_basket"].grid) {
			frm.fields_dict["vehicles_basket"].grid.grid_rows.forEach((grid_row) => {
				initialize_model_popover(grid_row);
			});
		}
	},

	deliver_to_dealer: function (frm) {
		if (frm.doc.deliver_to_dealer) {
			frappe.call({
				method: "edp_online_vehicles.events.get_warehouse_data.get_company_address",
				args: {
					company: frm.doc.deliver_to_dealer,
				},
				callback: function (r) {
					// Only proceed if r.message contains data
					if (r.message && r.message.length > 0) {
						let address_line1 = r.message[0].address_line1;
						let city = r.message[0].city;
						let country = r.message[0].country;
						let postal_code = r.message[0].pincode;

						const address = `${address_line1}\n${city}\n${country}\n${postal_code}`;

						frm.set_value("delivery_location", address);
						frm.refresh_field("delivery_location");
					} else {
						console.log("No address data found.");
						frm.set_value(
							"delivery_location",
							"No Shipping Address linked to Company",
						);
						frm.refresh_field("delivery_location");
					}
				},
			});
		}
	},
});

frappe.ui.form.on("Vehicles Order Item", {
	vehicles_basket_add: function (frm, cdt, cdn) {
		if (
			frm.fields_dict["vehicles_basket"] &&
			frm.fields_dict["vehicles_basket"].grid
		) {
			// Iterate over each grid row and initialize the popover.
			frm.fields_dict["vehicles_basket"].grid.grid_rows.forEach(
				(grid_row) => {
					initialize_model_popover(grid_row);
				},
			);
		} else {
			console.log("vehicles_basket grid is not defined on this form.");
		}
	},
	form_render: function (frm, cdt, cdn) {
		if (frm.doc.docstatus === 1) {
			// hide all "Insert Below" buttons in any child‑table popup
			$(".grid-append-row").hide();

			$(document).find(".grid-insert-row-below").hide();
		}

		let row = locals[cdt][cdn];

		if (row.model) {
			check_and_update_order_type(frm, cdt, cdn)
		}
	},

	model: function (frm, cdt, cdn) {

		var row = locals[cdt][cdn];

		if (row.model) {
			frappe.db.get_value('Model Colour', { model: row.model, default: 1 }, 'name').then(r => {
				let colour = r.message.name

				if (r.message && r.message.name) {
					frappe.model.set_value(cdt, cdn, "colour", colour);
				} else {
					frappe.model.set_value(cdt, cdn, "colour", '');
				}
			});
		}

		if (row.place_back_order) {
			frappe.model.set_value(cdt, cdn, "place_back_order", 0);
		}

		// Temporarily disable the 'dealer' event
		frm.fields_dict["vehicles_basket"].grid.fields_map[
			"dealer"
		].ignore_change = true;

		// Clear the dealer field without triggering the event
		frappe.model.set_value(cdt, cdn, "dealer", null);
		frm.fields_dict["vehicles_basket"].grid.update_docfield_property(
			"dealer",
			"description",
			"",
		);

		// Re-enable the 'dealer' event
		frm.fields_dict["vehicles_basket"].grid.fields_map[
			"dealer"
		].ignore_change = false;

		if (row.model) {
			frappe.call({
				method: "edp_online_vehicles.events.get_warehouse_data.get_model_details",
				args: {
					model: row.model,
				},
				callback: function (r) {
					if (r.message) {
						let model_desc = r.message[0].description;
						let model_year = r.message[0].model_year;
						let model_price = r.message[0].model_price;

						frappe.model.set_value(
							cdt,
							cdn,
							"description",
							model_desc,
						);
						frappe.model.set_value(
							cdt,
							cdn,
							"model_year",
							model_year,
						);
						frappe.model.set_value(
							cdt,
							cdn,
							"price_excl",
							model_price,
						);

						frm.refresh_field("vehicles_basket");
					}
				},
			});

			frappe.call({
				method: "edp_online_vehicles.events.get_warehouse_data.get_visible_HQ_warehouses",
				callback: function (r) {
					if (r.message && r.message.length > 0) {
						let warehouse_names = r.message.map((w) => w.name);
						let hq_company = r.message[0].company;

						frappe.call({
							method: "edp_online_vehicles.events.get_warehouse_data.check_warehouses",
							args: {
								dealers: [hq_company],
								warehouse_names: warehouse_names,
								model: row.model,
							},
							callback: function (r) {
								if (r.message > 0) {
									let basket = frm.doc.vehicles_basket || [];
									let warehouseCount = basket
										.filter(
											(item) => item.model === row.model,
										)
										.filter(
											(item) =>
												item.order_from === "Warehouse",
										)
										.filter(
											(item) => item.name !== row.name,
										).length;

									// if requested rows exceed available stock, force back-order
									if (warehouseCount >= r.message) {
										// reset to HQ + back-order
										resetDealerField(frm);
										updateDealerOptions(frm, [hq_company]);

										frappe.model.set_value(
											cdt,
											cdn,
											"dealer",
											hq_company,
										);
										frm.fields_dict[
											"vehicles_basket"
										].grid.update_docfield_property(
											"dealer",
											"description",
											"",
										);

										frappe.model.set_value(
											cdt,
											cdn,
											"place_back_order",
											1,
										);
										frappe.model.set_value(
											cdt,
											cdn,
											"order_from",
											"Back Order",
										);
										return;
									}

									updateDealerOptions(frm, [hq_company]);

									frappe.model.set_value(
										cdt,
										cdn,
										"dealer",
										hq_company,
									);
									frappe.model.set_value(
										cdt,
										cdn,
										"order_from",
										"Warehouse",
									);
									frm.refresh_field("vehicles_basket");

									if (row.order_from === "Warehouse") {
										if (
											frm.fields_dict[
											"mandatory_documents"
											] &&
											frm.fields_dict[
												"mandatory_documents"
											].grid
										) {
											let grid =
												frm.fields_dict[
													"mandatory_documents"
												].grid;

											grid.fields_map["document"].reqd =
												1;

											frm.refresh_field(
												"mandatory_documents",
											);
										}
									}
								} else {
									frappe.db
										.get_single_value(
											"Vehicle Stock Settings",
											"allow_dealer_to_dealer_orders",
										)
										.then((dealer_to_dealer) => {
											if (dealer_to_dealer) {
												frappe.call({
													method: "edp_online_vehicles.events.get_warehouse_data.get_visible_Dealer_warehouses",
													args: {
														ordering_dealer:
															frm.doc.dealer,
													},
													callback: function (r) {
														if (
															r.message &&
															r.message.length > 0
														) {
															let warehouse_names =
																r.message.map(
																	(w) =>
																		w.name,
																);
															let dealers =
																r.message.map(
																	(w) =>
																		w.company,
																);

															frappe.call({
																method: "edp_online_vehicles.events.get_warehouse_data.check_dealer_warehouses",
																args: {
																	dealers:
																		dealers,
																	warehouse_names:
																		warehouse_names,
																	model: row.model,
																},
																callback:
																	function (
																		r,
																	) {
																		let dealer =
																			r.message.map(
																				(
																					d,
																				) =>
																					d.dealer,
																			);
																		let uniqueDealers =
																			[
																				...new Set(
																					dealer,
																				),
																			];
																		if (
																			uniqueDealers.length >
																			0
																		) {
																			updateDealerOptions(
																				frm,
																				uniqueDealers,
																			);
																			frappe.model.set_value(
																				cdt,
																				cdn,
																				"order_from",
																				"Action Required",
																			);
																			frm.refresh_field(
																				"vehicles_basket",
																			);
																		} else {
																			resetDealerField(
																				frm,
																			);
																			updateDealerOptions(
																				frm,
																				[
																					hq_company,
																				],
																			);

																			frappe.model.set_value(
																				cdt,
																				cdn,
																				"dealer",
																				hq_company,
																			);
																			frm.fields_dict[
																				"vehicles_basket"
																			].grid.update_docfield_property(
																				"dealer",
																				"description",
																				"",
																			);

																			frappe.model.set_value(
																				cdt,
																				cdn,
																				"place_back_order",
																				1,
																			);
																			frappe.model.set_value(
																				cdt,
																				cdn,
																				"order_from",
																				"Back Order",
																			);
																		}
																	},
															});
														}
													},
												});
											} else {
												updateDealerOptions(frm, [
													hq_company,
												]);

												frappe.model.set_value(
													cdt,
													cdn,
													"dealer",
													hq_company,
												);
												frm.fields_dict[
													"vehicles_basket"
												].grid.update_docfield_property(
													"dealer",
													"description",
													"",
												);

												frappe.model.set_value(
													cdt,
													cdn,
													"place_back_order",
													1,
												);
												frappe.model.set_value(
													cdt,
													cdn,
													"order_from",
													"Back Order",
												);
											}
										})
										.catch((err) => {
											console.error(
												"Error fetching dealer_to_dealer setting:",
												err,
											);
										});
								}
							},
						});
					} else {
						frappe.show_alert(
							{
								message:
									"No HQ warehouses available. Please ask Head Office to select an HQ Warehouse",
								indicator: "orange",
							},
							30,
						);
					}
				},
			});

			frappe.model.set_value(cdt, cdn, "status", "Pending");
			check_and_update_order_type(frm, cdt, cdn)

			frm.fields_dict["vehicles_basket"].grid.refresh();
			calculate_sub_total(frm, "total_excl", "vehicles_basket");

			if (
				frm.fields_dict["vehicles_basket"] &&
				frm.fields_dict["vehicles_basket"].grid
			) {
				// Iterate over each grid row and initialize the popover.
				frm.fields_dict["vehicles_basket"].grid.grid_rows.forEach(
					(grid_row) => {
						initialize_model_popover(grid_row);
					},
				);
			} else {
				console.log(
					"vehicles_basket grid is not defined on this form.",
				);
			}

			frappe.db.get_value("Model Colour", { model: row.model, default: 1 }, "name")
				.then(r => {
					if (r.message && r.message.name) {
						// Use frappe.model.set_value which is cleaner for child tables
						frappe.model.set_value(cdt, cdn, "colour", r.message.name);
					}
				});
		}
	},

	place_back_order: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];

		frappe.model.set_value(cdt, cdn, "order_from", "Back Order");
	},

	vehicles_basket_remove(frm, cdt, cdn) {
		calculate_sub_total(frm, "total_excl", "vehicles_basket");

		// Create a list to store all `order_from` values
		let orderFromList = [];

		// Loop through the table to populate the list
		for (let row of frm.doc["vehicles_basket"]) {
			orderFromList.push(row.order_from);
		}

		// Check if the list contains 'Warehouse' or 'Back Order'
		if (
			orderFromList.includes("Warehouse") ||
			orderFromList.includes("Back Order")
		) {
			if (
				frm.fields_dict["mandatory_documents"] &&
				frm.fields_dict["mandatory_documents"].grid
			) {
				let grid = frm.fields_dict["mandatory_documents"].grid;

				// Set 'document' field as mandatory
				grid.fields_map["document"].reqd = 1;

				frm.refresh_field("mandatory_documents");
			}
		} else {
			if (
				frm.fields_dict["mandatory_documents"] &&
				frm.fields_dict["mandatory_documents"].grid
			) {
				let grid = frm.fields_dict["mandatory_documents"].grid;

				// Remove the mandatory requirement
				grid.fields_map["document"].reqd = 0;

				frm.refresh_field("mandatory_documents");
			}
		}
	},

	colour: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		check_and_update_order_type(frm, cdt, cdn)

	},
	purpose: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.purpose) {
			check_and_update_order_type(frm, cdt, cdn)
		} else {
			row.deafault_payment = null;
		}
	},
});


const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;
	for (const row of frm.doc[table_name]) {
		sub_total += row.price_excl;
	}

	frappe.model.set_value(
		frm.doc.doctype,
		frm.doc.name,
		field_name,
		sub_total,
	);
};

// Function to check if the document exists in the database
function check_if_document_exists(docname) {
	return frappe.db.exists("Vehicle Order", docname);
}

// Function to wait for document creation
function wait_for_document_creation(frm) {
	let interval = setInterval(() => {
		check_if_document_exists(frm.doc.name).then((exists) => {
			if (exists) {
				// Document has been created, run the logic
				clearInterval(interval);
				// run_order_creation(frm);
			}
		});
	}, 1000);
}


function open_add_multiple_dialog(frm) {
	let dialog = new frappe.ui.Dialog({
		title: "Add Multiple Rows",
		fields: [
			{
				label: "Model",
				fieldname: "model",
				fieldtype: "Link",
				options: "Model Administration",
				reqd: 1,
				onchange: function () {
					let model = dialog.get_value("model");

					if (model) {
						frappe.call({
							method: "edp_online_vehicles.events.get_warehouse_data.get_model_details",
							args: {
								model: model,
							},
							callback: function (r) {
								if (r.message) {
									let model_desc = r.message[0].description;
									let model_year = r.message[0].model_year;
									let model_price = r.message[0].model_price;

									dialog.set_value("description", model_desc || "");
									dialog.set_value("model_year", model_year || "");
									dialog.set_value("price_excl", model_price || "");
								}
							},
						});
					} else {
						dialog.set_value("description", "");
						dialog.set_value("model_year", "");
						dialog.set_value("price_excl", "");
					}
				},
				get_query: function () {
					return {
						filters: {
							mark_as_discontinued: 0,
						},
					};
				},
			},
			{
				label: "Description",
				fieldname: "description",
				fieldtype: "Data",
				read_only: 1,
			},
			{
				label: "Model Year",
				fieldname: "model_year",
				fieldtype: "Data",
				read_only: 1,
			},
			{
				label: "Dealer Billing (Excl)",
				fieldname: "price_excl",
				fieldtype: "Currency",
				read_only: 1,
			},
			{
				label: "Purpose",
				fieldname: "purpose",
				fieldtype: "Link",
				options: "Vehicles Order Purpose",
				reqd: 1,
			},
			{
				label: "Colour",
				fieldname: "colour",
				fieldtype: "Link",
				options: "Model Colour",
				reqd: 1,
				get_query: function () {
					let model = dialog.get_value("model");

					if (!model) {
						frappe.msgprint("Please select a model first.");
					}

					return {
						filters: {
							model: model,
							discontinued: 0,
						},
					};
				},
			},
			{
				label: "Quantity",
				fieldname: "quantity",
				fieldtype: "Int",
				reqd: 1,
			},
		],
		primary_action_label: "Confirm",
		primary_action: async function (values) {
			if (!values.model || !values.purpose || !values.colour || !values.quantity) {
				frappe.msgprint(__("Please fill in all fields."));
				return;
			}

			if (values.quantity <= 0) {
				frappe.msgprint(__("Quantity must be greater than zero."));
				return;
			}

			dialog.hide();

			for (let i = 0; i < values.quantity; i++) {
				let new_row = frm.add_child("vehicles_basket");

				await frappe.model.set_value(new_row.doctype, new_row.name, "model", values.model);
				await frappe.model.set_value(new_row.doctype, new_row.name, "purpose", values.purpose);
				await frappe.model.set_value(new_row.doctype, new_row.name, "description", values.description);
				await frappe.model.set_value(new_row.doctype, new_row.name, "model_year", values.model_year);
				await frappe.model.set_value(new_row.doctype, new_row.name, "price_excl", values.price_excl);
				await frappe.model.set_value(new_row.doctype, new_row.name, "colour", values.colour);

				await check_and_update_order_type(frm, new_row.doctype, new_row.name);
			}

			frm.refresh_field("vehicles_basket");
		},
	});

	dialog.show();
}

function initialize_model_popover(grid_row) {
	// Make sure the grid_row and its model column exist
	if (grid_row && grid_row.columns && grid_row.columns.model) {
		const $modelField = grid_row.columns.model;

		// Dispose any existing popover instance to avoid duplicates.
		if ($modelField.data("bs.popover")) {
			$modelField.popover("dispose");
		}

		// Initialize the Bootstrap popover with a content callback.
		$modelField.popover({
			html: true,
			trigger: "hover",
			placement: "top",
			container: "body",
			delay: { show: 250, hide: 250 },
			content: function () {
				// Get the current document (row) data
				const row = grid_row.doc;

				// If a model is selected then fetch the tooltip data.
				if (row.model) {
					// Set a temporary message until the call returns.
					$modelField.attr("data-content", "<p>Loading...</p>");
					// Make the call to fetch popover content.
					frappe.call({
						method: "edp_online_vehicles.events.hover_tooltip_data.order_model_hover_data",
						args: { model: row.model },
						callback: function (r) {
							if (r.message) {
								const {
									image,
									model_name,
									description,
									brand,
									category,
									model_year,
								} = r.message;
								// Set the default image if no image is provided.
								const defaultImage =
									"/assets/edp_online_vehicles/images/default_popover_image.png";
								const imageUrl = image ? image : defaultImage;

								const tooltipHtml = `
									<style>
										.popover-body {
											font-size: 28px !important;
										}
										.popover-body h4 {
											font-size: 32px !important;
										}
										.popover-body p {
											font-size: 28px !important;
										}
									</style>
									<div style="text-align: center; padding: 10px;">
										<img src="${imageUrl}" alt="Model Image" style="width: 100px; height: auto; object-fit: contain;"/>
										<p></p>
										<h4>${model_name}</h4>
										<p><b>Description:</b> ${description || "N/A"}</p>
										<p><b>Brand:</b> ${brand || "N/A"}</p>
										<p><b>Category:</b> ${category || "N/A"}</p>
										<p><b>Year:</b> ${model_year || "N/A"}</p>
									</div>
								`;
								// Update the popover content after receiving data.
								$modelField
									.attr("data-content", tooltipHtml)
									.data("bs.popover")
									.setContent();
							}
						},
					});
				}
				// Returning the current content. (It will update asynchronously.)
				return $modelField.attr("data-content");
			},
		});
	} else {
		console.log("Grid row or model column is undefined:", grid_row);
	}
}

function check_and_update_order_type(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) return Promise.resolve();

	return frm.call("get_row_stock_info", {
		row: {
			model: row.model,
			colour: row.colour,
			purpose: row.purpose,
			status: row.status
		},
	}).then(r => {
		if (!r.message) return;

		const has_stock = r.message.has_stock;
		const dealers = [...new Set(r.message.dealers || [])];
		const order_from = has_stock ? "Warehouse" : "Back Order";
		const place_back_order = has_stock ? 0 : 1;

		if (row.order_from !== order_from) {

		}

		if (row.order_from !== order_from && order_from === "Back Order") {
			frappe.show_alert({
				message: "No stock available at any HQ warehouse.",
				indicator: "blue"
			});
		}
		return frappe.model.set_value(cdt, cdn, "order_from", order_from)
			.then(() => frappe.model.set_value(cdt, cdn, "place_back_order", place_back_order))
			.then(() => {
				const grid = frm.fields_dict["vehicles_basket"]?.grid;
				const grid_row = grid?.grid_rows_by_docname?.[cdn];
				const options = dealers.join("\n");

				if (grid_row) {
					const dealer_df = grid_row.docfields?.find(df => df.fieldname === "dealer");
					if (dealer_df) {
						dealer_df.options = options;
					}

					const dealer_ctrl = grid_row.on_grid_fields_dict?.dealer;
					if (dealer_ctrl) {
						dealer_ctrl.df.options = options;
						dealer_ctrl.refresh();
					}
				}

				return frappe.model.set_value(cdt, cdn, "dealer", dealers[0] || "");
			});
	});
}