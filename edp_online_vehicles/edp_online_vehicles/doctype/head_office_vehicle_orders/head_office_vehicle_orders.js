// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;
let previous_vinno_value = null;
let previous_price = null;
let hq_comment = null;

function update_pricing_total_excl(frm) {
	let price = flt(frm.doc.price_excl) || 0;
	let discount = flt(frm.doc.discount_amount_excl) || 0;
	frm.set_value("total_excl", price - discount);
}

frappe.ui.form.on("Head Office Vehicle Orders", {
	refresh(frm) {
		let status_order = [];
		let myPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
				frappe.db
					.get_doc("Vehicle Stock Settings")
					.then((doc) => {
						status_order = doc.vehicle_order_status_order;
						resolve(status_order);
					})
					.catch((err) => {
						reject(err);
					});
			}, 1000);
		});

		myPromise.then(() => {
			status_order = status_order
				.slice(0, status_order.length)
				.map((item) => item.status);

			status_order = status_order
				.map((status) => `'${status}'`)
				.join(", ");

			frm.set_query("status", function () {
				return {
					query: "edp_online_vehicles.events.vehicle_sale_status.get_HQ_status_order",
					filters: {
						status_order: status_order,
					},
				};
			});
		});

		if (frm.is_new() && !frm.doc.status) {
			frappe.call({
				method: "edp_online_vehicles.events.vehicle_sale_status.get_HQ_default",
				args: {
					doc_name: frm.doc.name,
				},
				callback: function (r) {
					frm.set_value("status", r.message);
				},
			});
		}

		let restricted_role = "Vehicles Administrator";

		if (!frappe.user_roles.includes(restricted_role)) {
			$(".form-sidebar").hide();
			$(".new-timeline").hide();
			$(".sidebar-toggle-btn").hide();
			$("button[data-fieldname='allocate']").hide();
			$("button[data-fieldname='un_allocate']").hide();
			$("button[data-fieldname='change_model']").hide();
		}

		toggle_vin_serial_requirement(frm);

		frm.add_custom_button(
			__("Request for Credit"),
			() => {
				if (frm.doc.vinserial_no) {
					frappe.new_doc("Vehicle Request For Credit", {
						order_no: frm.doc.name,
						vin_serial_no: frm.doc.vinserial_no,
					});
				} else {
					frappe.msgprint(
						"You can only request for credit on an order with a Vin/Serial No.",
					);
				}
			},
			__("Actions"),
		);

		previous_status_value = frm.doc.status;
		previous_vinno_value = frm.doc.vinserial_no;
		previous_price = frm.doc.price_excl;
		update_pricing_total_excl(frm);
	},
	price_excl(frm) {
		update_pricing_total_excl(frm);
	},
	discount_amount_excl(frm) {
		update_pricing_total_excl(frm);
	},
	before_submit: function (frm) {
		// if (frm.doc.price_excl === 0) {
		//     frappe.validated = false
		//     frappe.throw('Price can not be zero.')
		// }
	},
	after_save: function (frm) {
		if (frm.doc.status) {
			if (
				frm.doc.status !== previous_status_value &&
				frm.doc.vinserial_no !== previous_vinno_value &&
				frm.doc.price_excl !== previous_price
			) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_all",
					args: {
						order_doc: frm.doc.order_no,
						status: frm.doc.status,
						vinno: frm.doc.vinserial_no,
						price: frm.doc.price_excl,
						row_id: frm.doc.row_id,
					},
				});
			} else if (
				frm.doc.status !== previous_status_value &&
				frm.doc.vinserial_no !== previous_vinno_value
			) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_vinno_status",
					args: {
						order_doc: frm.doc.order_no,
						status: frm.doc.status,
						vinno: frm.doc.vinserial_no,
						row_id: frm.doc.row_id,
					},
				});
			} else if (
				frm.doc.vinserial_no !== previous_vinno_value &&
				frm.doc.price_excl !== previous_price
			) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price_vinno",
					args: {
						order_doc: frm.doc.order_no,
						vinno: frm.doc.vinserial_no,
						price: frm.doc.price_excl,
						row_id: frm.doc.row_id,
					},
				});
			} else if (
				frm.doc.status !== previous_status_value &&
				frm.doc.price_excl !== previous_price
			) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price_status",
					args: {
						order_doc: frm.doc.order_no,
						status: frm.doc.status,
						price: frm.doc.price_excl,
						row_id: frm.doc.row_id,
					},
				});
			} else {
				if (frm.doc.status !== previous_status_value) {
					frappe.call({
						method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_status",
						args: {
							order_doc: frm.doc.order_no,
							status: frm.doc.status,
							row_id: frm.doc.row_id,
						},
					});
				}

				if (frm.doc.vinserial_no !== previous_vinno_value) {
					frappe.call({
						method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_vinno",
						args: {
							order_doc: frm.doc.order_no,
							vinno: frm.doc.vinserial_no,
							row_id: frm.doc.row_id,
						},
					});
				}

				if (frm.doc.price_excl !== previous_price) {
					frappe.call({
						method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price",
						args: {
							order_doc: frm.doc.order_no,
							price: frm.doc.price_excl,
							row_id: frm.doc.row_id,
						},
					});
				}
			}
		}

		if (frm.doc.vinserial_no !== previous_vinno_value) {
			if (previous_vinno_value) {
				frm.call("remove_allocated_vinno", {
					previous_vinno_value,
				}).then((r) => {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							10,
						);
					}
				});
			}

			if (frm.doc.vinserial_no) {
				frm.call("allocate_vinno", { front_end_call: true }).then(
					(r) => {
						if (r.message) {
							frappe.show_alert(
								{
									message: r.message,
								},
								10,
							);
						}
					},
				);

				frm.call("remove_tags").then((r) => {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							10,
						);
					}
				});
			}
		}

		if (frm.doc.status !== previous_status_value) {
			frappe.call({
				method: "edp_online_vehicles.events.status_tracking.status_tracking",
				args: {
					doc_id: frm.doc.name || '',
					status: frm.doc.claim_status || '',
					previous_status: previous_status_value || '',
					doctype: frm.doc.doctype || '',
				},
			});
		}

		previous_status_value = frm.doc.status;
		previous_vinno_value = frm.doc.vinserial_no;
		previous_price = frm.doc.price_excl;
	},
	onload(frm) {
		$(document).on("click", '[data-fieldname="status"]', function () {
			previous_status_value = frm.doc.status;
			console.log(previous_status_value);

			var $field = $(this);
			var $input_area = $field.closest(".link-field");

			if ($input_area.length) {
				var $input = $input_area.find("input");
				var $link = $input_area.find(".link-btn");

				// Perform the actions of the btn-clear button
				// $link.hide();
				// $input.val("").focus();

				// Reattach the focusout event on every click
				$input.off("focusout").on("focusout", function () {
					const field_value = $input.val();

					// Check if the input value is empty, and restore the previous status value
					if (!field_value || field_value === "") {
						$input.val(previous_status_value);
					}
				});
			}
			return false;
		});

		frm.set_query("vinserial_no", () => {
			return {
				query: "edp_online_vehicles.events.custom_queries.head_office_orders_vin_filter",
				filters: {
					model: frm.doc.model || "",
					availability_status: "Available",
					dealer: frm.doc.order_placed_to || "",
					colour: frm.doc.colour_delivered || "",
				},
			};
		});
	},
	before_cancel(frm) {
		let availability_status = null;
		frappe.db
			.get_value(
				"Vehicle Stock",
				{ name: frm.doc.vinserial_no },
				"availability_status",
			)
			.then((response) => {
				availability_status = response.message.availability_status;

				if (
					availability_status === "Stolen" ||
					availability_status === "Sold" ||
					availability_status === "Active Contract"
				) {
					frappe.validated = false;
					frappe.msgprint(
						"Cancellation is not allowed for this vehicle.",
					);
					frappe.msgprint(frappe.validated);
					return;
				}

				if (frappe.validated === true) {
					frappe.validated = false;

					frappe.prompt(
						{
							label: "Reason for Cancellation",
							fieldname: "cancellation_reason",
							fieldtype: "Small Text",
							reqd: 1,
						},
						(values) => {
							let hq_comment = values.cancellation_reason;

							if (!hq_comment) {
								frappe.msgprint(
									"Cancellation reason is required.",
								);
							} else {
								let user = frappe.user.name; // Get the current user name
								let userComment = hq_comment;
								hq_comment = "User comment: " + userComment;

								// Set the value of the 'comment' field on the form
								// frm.set_value('comment', hq_comment);
								frappe.validated = true;
								frappe.call({
									method: "edp_online_vehicles.events.cancel_docs.cancel_doc",
									args: {
										doctype: "Head Office Vehicle Orders",
										doc: frm.doc.name,
										vinno: frm.doc.vinserial_no,
										hq: frm.doc.order_placed_by,
										dealer: frm.doc.order_placed_to,
										colour: frm.doc.colour_delivered,
										model: frm.doc.model,
										rate: frm.doc.price_excl,
										hq_comment: hq_comment,
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
						"Cancellation Reason",
						"Submit",
					);
				}
			});
		frappe.msgprint(frappe.validated);
	},

	after_cancel(frm) {
		frappe.msgprint("After Cancel");
	},

	vinserial_no: function (frm) {
		if (frm.doc.vinserial_no) {
			frappe.call({
				method: "edp_online_vehicles.events.get_model_colour.get_model_colour",
				args: {
					vinno: frm.doc.vinserial_no,
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("colour_delivered", r.message);
					}
				},
			});
		}
	},

	allocate: function (frm) {
		frappe.call({
			method: "edp_online_vehicles.events.custom_queries.head_office_orders_vin_dialog_filter",
			args: {
				model: frm.doc.model || "",
				availability_status: "Available",
				dealer: frm.doc.order_placed_to,
				colour: frm.doc.colour_delivered || "",
			},
			callback: function (response) {
				let vin_stock = response.message || [];

				let vin_reserved = [];
				let shipment_stock_data = [];
				let selected_vin = null;
				let selected_tab = "stock";

				// Create dialog
				const dialog = new frappe.ui.Dialog({
					title: "Select VIN Number",
					fields: [
						{
							label: "VIN Lists",
							fieldname: "vin_list",
							fieldtype: "HTML",
						},
					],
					size: "extra-large",
					primary_action_label: "Confirm",
					primary_action() {
						if (selected_tab === "reserved" && selected_vin) {
							frappe.confirm(
								__(
									"This VIN/Serial No has been reserved. Are you sure you want to allocate this vehicle to the order?",
								),
								() => applySelection(),
								() => { },
							);
						} else if (selected_tab === "shipment" && selected_vin) {
							frappe.confirm(
								__(
									"This VIN/Serial No is part of a shipment that has not been. Are you sure you want to allocate this vehicle to the order?",
								),
								() => applySelection_shipment(),
								() => { },
							);

						} else if (selected_vin) {
							applySelection();
						} else {
							frappe.msgprint(
								__(
									"Please select a VIN number before confirming.",
								),
							);
						}

						function applySelection() {
							frm.set_value("vinserial_no", selected_vin);
							frm.set_value("status", "Processed");
							frm.toggle_display("vinserial_no", true);
							frm.set_value("shipment_stock", "");
							dialog.hide();
						}
						function applySelection_shipment() {
							frm.set_value("status", "Processed");
							frm.set_value("shipment_stock", selected_vin);
							dialog.hide();
						}
					},
				});

				// Build tab headers
				const tabs_html = `
                    <ul class="nav nav-tabs" role="tablist">
                        <li class="nav-item"><a class="nav-link active" data-tab="stock">Stock</a></li>
                        <li class="nav-item"><a class="nav-link" data-tab="reserved">Reserved Vehicles</a></li>
                        <li class="nav-item"><a class="nav-link" data-tab="shipment">Shipment Stock</a></li>
                    </ul>
                `;

				// Build three tab contents
				const contents_html = `
                    <div class="tab-content" style="margin-top:10px;">
                        <!-- Stock -->
                        <div class="tab-pane show active" data-content="stock">
                            <input type="text" id="search-vin-stock" class="form-control" placeholder="Search VIN/Serial No" style="margin-bottom:10px;" />
                            <input type="text" id="search-colour-stock" class="form-control" placeholder="Search Colour" style="margin-bottom:10px;" />
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Vin/Serial No</th>
                                        <th>Model</th>
                                        <th>Colour</th>
                                        <th>Description</th>
                                        <th>Date Received</th>
                                    </tr>
                                </thead>
                                <tbody id="vin-list-stock"></tbody>
                            </table>
                        </div>

                        <!-- Reserved -->
                        <div class="tab-pane fade" data-content="reserved">
                            <input type="text" id="search-vin-reserved" class="form-control" placeholder="Search VIN/Serial No" style="margin-bottom:10px;" />
                            <input type="text" id="search-colour-reserved" class="form-control" placeholder="Search Colour" style="margin-bottom:10px;" />
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Vin/Serial No</th>
                                        <th>Model</th>
                                        <th>Colour</th>
                                        <th>Description</th>
                                        <th>Date Received</th>
                                    </tr>
                                </thead>
                                <tbody id="vin-list-reserved"></tbody>
                            </table>
                        </div>

                        <!-- Shipment -->
                        <div class="tab-pane fade" data-content="shipment">
                            <input type="text" id="search-vin-shipment" class="form-control" placeholder="Search VIN/Serial No" style="margin-bottom:10px;" />
                            <input type="text" id="search-colour-shipment" class="form-control" placeholder="Search Colour" style="margin-bottom:10px;" />
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Vin/Serial No</th>
                                        <th>Model</th>
                                        <th>Colour</th>
                                        <th>Description</th>
                                        <th>ETA Date</th>
                                    </tr>
                                </thead>
                                <tbody id="shipment-stock-list"></tbody>
                            </table>
                        </div>
                    </div>
                `;

				// Inject HTML into dialog
				dialog.fields_dict.vin_list.$wrapper.html(
					tabs_html + contents_html,
				);

				// Tab switching logic
				dialog.$wrapper.on("click", ".nav-link", function () {
					const tab = $(this).data("tab");
					selected_tab = tab;
					dialog.$wrapper.find(".nav-link").removeClass("active");
					$(this).addClass("active");
					dialog.$wrapper
						.find(".tab-pane")
						.removeClass("show active")
						.addClass("fade");
					dialog.$wrapper
						.find(`[data-content="${tab}"]`)
						.removeClass("fade")
						.addClass("show active");
					// clear any previous selection
					selected_vin = null;
					dialog.$wrapper.find("tr").css("background-color", "");
				});

				// Render functions
				function renderStockList() {
					const $body = dialog.$wrapper
						.find("#vin-list-stock")
						.empty();
					if (!vin_stock.length) {
						$body.append(
							`<tr><td colspan="5" class="text-center">No Stock Available</td></tr>`,
						);
						return;
					}
					vin_stock.forEach((v) => {
						const row = $(`<tr class="vin-row" data-vin="${v[0]}">
                            <td>${v[1]}</td><td>${v[2]}</td><td>${v[3]}</td>
                            <td>${v[4]}</td><td>${v[5]}</td>
                        </tr>`);
						row.on("click", () => {
							selected_vin = v[0];
							dialog.$wrapper
								.find(".vin-row")
								.css("background-color", "");
							row.css("background-color", "#d9edf7");
						});
						$body.append(row);
					});
				}

				function renderReservedList() {
					frappe.call({
						method: "edp_online_vehicles.events.custom_queries.head_office_orders_vin_dialog_filter",
						args: {
							model: frm.doc.model || "",
							availability_status: "Reserved",
							dealer: frm.doc.order_placed_to,
							colour: frm.doc.colour_delivered || "",
						},
						callback: function (r) {
							vin_reserved = r.message || [];
							const $body = dialog.$wrapper
								.find("#vin-list-reserved")
								.empty();
							if (!vin_reserved.length) {
								$body.append(
									`<tr><td colspan="5" class="text-center">No Reserved Vehicles</td></tr>`,
								);
								return;
							}
							vin_reserved.forEach((v) => {
								const row =
									$(`<tr class="vin-row-res" data-vin="${v[0]}">
                                    <td>${v[1]}</td><td>${v[2]}</td><td>${v[3]}</td>
                                    <td>${v[4]}</td><td>${v[5]}</td>
                                </tr>`);
								row.on("click", () => {
									selected_vin = v[0];
									dialog.$wrapper
										.find(".vin-row-res")
										.css("background-color", "");
									row.css("background-color", "#fcf8e3");
								});
								$body.append(row);
							});
						},
					});
				}

				function renderShipmentList() {
					frappe.call({
						method: "edp_online_vehicles.events.custom_queries.head_office_orders_shipment_dialog_filter",
						args: {
							model: frm.doc.model || "",
							availability_status: "Available",
							dealer: frm.doc.order_placed_to,
							colour: frm.doc.colour_delivered || "",
						},
						callback: function (sh) {
							shipment_stock_data = sh.message || [];
							const $body = dialog.$wrapper
								.find("#shipment-stock-list")
								.empty();
							if (!shipment_stock_data.length) {
								$body.append(
									`<tr><td colspan="5" class="text-center">No Stock Available</td></tr>`,
								);
								return;
							}
							shipment_stock_data.forEach((s) => {
								const eta = s[4] || "N/A";
								const row =
									$(`<tr class="ship-row" data-vin="${s[0]}">
                                    <td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td>
                                    <td>${s[3]}</td><td>${eta}</td>
                                </tr>`);
								row.on("click", () => {
									selected_vin = s[0];
									dialog.$wrapper
										.find(".ship-row")
										.css("background-color", "");
									row.css("background-color", "#d9edf7");
									// also set shipment-specific fields
									frm.set_value("shipment_no", s[5]);
									frm.set_value(
										"shipment_target_warehouse",
										s[6],
									);
								});
								$body.append(row);
							});
						},
					});
				}

				// Filter handlers (VIN + colour) – identical logic for each tab
				function setupFilters() {
					dialog.$wrapper.on(
						"input",
						"#search-vin-stock, #search-colour-stock",
						() => {
							const vinTxt = $("#search-vin-stock")
								.val()
								.toUpperCase();
							const colTxt = $("#search-colour-stock")
								.val()
								.toUpperCase();
							dialog.$wrapper
								.find("#vin-list-stock tr")
								.each(function () {
									const vin = $(this)
										.find("td")
										.eq(0)
										.text()
										.toUpperCase();
									const col = $(this)
										.find("td")
										.eq(2)
										.text()
										.toUpperCase();
									$(this).toggle(
										vin.includes(vinTxt) &&
										col.includes(colTxt),
									);
								});
						},
					);
					dialog.$wrapper.on(
						"input",
						"#search-vin-reserved, #search-colour-reserved",
						() => {
							const vinTxt = $("#search-vin-reserved")
								.val()
								.toUpperCase();
							const colTxt = $("#search-colour-reserved")
								.val()
								.toUpperCase();
							dialog.$wrapper
								.find("#vin-list-reserved tr")
								.each(function () {
									const vin = $(this)
										.find("td")
										.eq(0)
										.text()
										.toUpperCase();
									const col = $(this)
										.find("td")
										.eq(2)
										.text()
										.toUpperCase();
									$(this).toggle(
										vin.includes(vinTxt) &&
										col.includes(colTxt),
									);
								});
						},
					);
					dialog.$wrapper.on(
						"input",
						"#search-vin-shipment, #search-colour-shipment",
						() => {
							const vinTxt = $("#search-vin-shipment")
								.val()
								.toUpperCase();
							const colTxt = $("#search-colour-shipment")
								.val()
								.toUpperCase();
							dialog.$wrapper
								.find("#shipment-stock-list tr")
								.each(function () {
									const vin = $(this)
										.find("td")
										.eq(0)
										.text()
										.toUpperCase();
									const col = $(this)
										.find("td")
										.eq(2)
										.text()
										.toUpperCase();
									$(this).toggle(
										vin.includes(vinTxt) &&
										col.includes(colTxt),
									);
								});
						},
					);
				}

				// Initial render
				renderStockList(); // Stock tab
				renderReservedList(); // Reserved tab
				renderShipmentList(); // Shipment tab
				setupFilters();
				dialog.show();
			},
		});
	},

	un_allocate: function (frm) {
		if (previous_vinno_value || frm.doc.shipment_no) {
			const dialog = new frappe.ui.Dialog({
				title: __("Reason"),
				fields: [
					{
						label: "Please provide a reason for un-allocating this vehicle.",
						fieldname: "comment",
						fieldtype: "Data",
						reqd: 1,
					},
				],
				primary_action_label: "Submit",
				primary_action(values) {
					if (values.comment) {
						let comment = values.comment;
						if (frm.doc.vinserial_no) {
							frm.set_value("vinserial_no", null).then(() => {
								frm.call("remove_allocated_vinno", {
									previous_vinno_value,
									comment,
								}).then((r) => {
									if (r.message) {
										frappe.show_alert(
											{
												message: r.message,
											},
											10,
										);

									}
								});
							});
						}
						
						if (frm.doc.shipment_stock) {
							frappe.call({
								method: "edp_online_vehicles.events.get_available_orders.unallocate_shipment",
								args: {
									shipment_no: frm.doc.shipment_no,
									shipment_stock: frm.doc.shipment_stock
								}
							})
							frm.set_value("shipment_stock", null)
							frm.set_value("shipment_no", null)
							frm.set_value("shipment_target_warehouse", null)
						}
						frm.save();
						dialog.hide();
					} else {
						frappe.msgprint(
							__(
								"Comment is required to un-allocate the vehicle.",
							),
						);
					}
				},
			});

			dialog.show();
		} else {
			frappe.msgprint(
				"Cannot un-allocate an VIN/Serial No from an Order that does not have a VIN/Serial No allocated to it.",
			);
		}
	},

	change_model: function (frm) {
		if (frm.doc.vinserial_no) {
			frappe.msgprint(
				"A Vin/Serial No is already allocated to this order. Please un-allocate the Vin/Serial No before changing the model.",
			);
			return;
		}

		const dialog = new frappe.ui.Dialog({
			title: __("Reason"),
			fields: [
				{
					label: "New Model",
					fieldname: "new_model",
					fieldtype: "Link",
					options: "Model Administration",
				},
				{
					label: "Please provide a reason for changing the model.",
					fieldname: "comment",
					fieldtype: "Small Text",
					reqd: 1,
				},
			],
			primary_action_label: "Submit",
			primary_action(values) {
				if (values.comment) {
					let comment = values.comment;
					let model = values.new_model;

					frm.set_value("model", model).then(() => {
						frm.call("post_comment", { comment });
					});

					dialog.hide();
				} else {
					frappe.msgprint(
						__("Comment is required to change the model."),
					);
				}
			},
		});

		dialog.show();
	},

	status(frm) {
		toggle_vin_serial_requirement(frm);
	},

	check_invoice(frm) {
		frappe.call({
			method: "edp_online_vehicles_mahindrasa.integrations.sap_integration.request_sap_invoice",
			args: {
				docname: frm.doc.name,
			},
			freeze: true,
			freeze_message: __("Checking Invoice..."),
			callback: function (r) {
				if (r.message) {
					frappe.show_alert({
						message: r.message,
						indicator: "green"
					}, 5);
				}
				frm.reload_doc();
			},
			error: function (r) {
				frappe.show_alert({
					message: r.message || __("Failed to check invoice"),
					indicator: "red"
				}, 5);
			}
		});
	},

	check_credit_note(frm) {
		frappe.call({
			method: "edp_online_vehicles_mahindrasa.integrations.sap_integration.request_sap_credit_note",
			args: {
				docname: frm.doc.name,
			},
			freeze: true,
			freeze_message: __("Requesting Credit Note..."),
			callback: function (r) {
				if (r.message) {
					frappe.show_alert({
						message: r.message,
						indicator: "green"
					}, 5);
				}
				frm.reload_doc();
			},
			error: function (r) {
				frappe.show_alert({
					message: r.message || __("Failed to request credit note"),
					indicator: "red"
				}, 5);
			}
		});
	}
});

function toggle_vin_serial_requirement(frm) {
	if (!frm.doc.status) return;

	frappe.db
		.get_value(
			"Vehicles Order Status",
			frm.doc.status,
			"vin_serial_no_mandatory",
		)
		.then((r) => {
			// ensure we coerce to boolean
			const isReq = r.message.vin_serial_no_mandatory === 1;
			// set the property
			frm.set_df_property("vinserial_no", "reqd", isReq ? 1 : 0);
			// immediately refresh the field UI
			frm.refresh_field("vinserial_no");
		});
}
