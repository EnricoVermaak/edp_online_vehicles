/* global edp_online_vehicles */

edp_online_vehicles.PartOrder.Controller = class {
	constructor(wrapper) {
		this.wrapper = $(wrapper).find(".layout-main-section");
		this.page = wrapper.page;

		this.check_opening_entry();
	}

	fetch_opening_entry() {
		return frappe.call(
			"edp_online_vehicles.edp_online_vehicles.page.part_order_1.point_of_sale.check_opening_entry",
			{
				user: frappe.session.user,
			},
		);
	}

	check_opening_entry() {
		this.prepare_app_defaults();
	}

	create_opening_voucher() {
		const me = this;
		const table_fields = [
			{
				fieldname: "mode_of_payment",
				fieldtype: "Link",
				in_list_view: 1,
				label: __("Mode of Payment"),
				options: "Mode of Payment",
				reqd: 1,
			},
			{
				fieldname: "opening_amount",
				fieldtype: "Currency",
				in_list_view: 1,
				label: __("Opening Amount"),
				options: "company:company_currency",
				change: function () {
					dialog.fields_dict.balance_details.df.data.some((d) => {
						if (d.idx == this.doc.idx) {
							d.opening_amount = this.value;
							dialog.fields_dict.balance_details.grid.refresh();
							return true;
						}
					});
				},
			},
		];
		const fetch_pos_payment_methods = () => {
			const pos_profile = dialog.fields_dict.pos_profile.get_value();
			if (!pos_profile) return;
			frappe.db
				.get_doc("POS Profile", pos_profile)
				.then(({ payments }) => {
					dialog.fields_dict.balance_details.df.data = [];
					payments.forEach((pay) => {
						const { mode_of_payment } = pay;
						dialog.fields_dict.balance_details.df.data.push({
							mode_of_payment,
							opening_amount: "0",
						});
					});
					dialog.fields_dict.balance_details.grid.refresh();
				});
		};
		const dialog = new frappe.ui.Dialog({
			title: __("Create POS Opening Entry"),
			static: true,
			fields: [
				{
					fieldtype: "Link",
					label: __("Company"),
					default: frappe.defaults.get_default("company"),
					options: "Company",
					fieldname: "company",
					reqd: 1,
				},
				{
					fieldtype: "Link",
					label: __("POS Profile"),
					options: "POS Profile",
					fieldname: "pos_profile",
					reqd: 1,
					get_query: () => pos_profile_query(),
					onchange: () => fetch_pos_payment_methods(),
				},
				{
					fieldname: "balance_details",
					fieldtype: "Table",
					label: __("Opening Balance Details"),
					cannot_add_rows: false,
					in_place_edit: true,
					reqd: 1,
					data: [],
					fields: table_fields,
				},
			],
			primary_action: async function ({
				company,
				pos_profile,
				balance_details,
			}) {
				if (!balance_details.length) {
					frappe.show_alert({
						message: __(
							"Please add Mode of payments and opening balance details.",
						),
						indicator: "red",
					});
					return frappe.utils.play_sound("error");
				}

				// filter balance details for empty rows
				balance_details = balance_details.filter(
					(d) => d.mode_of_payment,
				);

				const method =
					"erpnext.selling.page.point_of_sale.point_of_sale.create_opening_voucher";
				const res = await frappe.call({
					method,
					args: { pos_profile, company, balance_details },
					freeze: true,
				});
				!res.exc && me.prepare_app_defaults(res.message);
				dialog.hide();
			},
			primary_action_label: __("Submit"),
		});
		dialog.show();
		const pos_profile_query = () => {
			return {
				query: "erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query",
				filters: { company: dialog.fields_dict.company.get_value() },
			};
		};
	}

	async prepare_app_defaults(data) {
		// this.pos_opening = data.name;
		// this.company = data.company;
		// this.pos_profile = data.pos_profile;
		// this.pos_opening_time = data.period_start_date;
		// this.item_stock_map = {};
		this.settings = {};

		frappe.db
			.get_value("Stock Settings", undefined, "allow_negative_stock")
			.then(({ message }) => {
				this.allow_negative_stock =
					flt(message.allow_negative_stock) || false;
			});

		this.make_app();

		// frappe.call({
		// 	method: "erpnext.selling.page.point_of_sale.point_of_sale.get_pos_profile_data",
		// 	args: { pos_profile: this.pos_profile },
		// 	callback: (res) => {
		// 		const profile = res.message;
		// 		Object.assign(this.settings, profile);
		// 		this.settings.customer_groups = profile.customer_groups.map((group) => group.name);

		// 	},
		// });
	}

	set_opening_entry_status() {
		this.page.set_title_sub(
			`<span class="indicator orange">
				<a class="text-muted" href="#Form/POS%20Opening%20Entry/${this.pos_opening}">
					Opened at ${frappe.datetime.str_to_user(this.pos_opening_time)}
				</a>
			</span>`,
		);
	}

	make_app() {
		let route_options = frappe.route_options;

		this.prepare_dom();
		this.prepare_components();
		this.prepare_menu();
		this.prepare_fullscreen_btn();
		this.make_new_invoice().then(() => {
			this.check_route_options(route_options);
		});
	}

	prepare_dom() {
		this.wrapper.append(`<div class="part-order-app"></div>`);

		this.$components_wrapper = this.wrapper.find(".part-order-app");
	}

	prepare_components() {
		this.init_item_selector();
		this.init_item_details();
		this.init_item_cart();
		this.init_payments();
		this.init_recent_order_list();
		this.init_order_summary();
	}

	check_route_options(route_options) {
		if (route_options && route_options.parts) {
			let items = route_options.parts;

			console.log(items);

			// Clear the route options so this check only runs once
			frappe.route_options = null;

			// Loop through each declined item and call on_cart_update
			items.forEach((item) => {
				this.on_cart_update({
					field: "qty",
					value: item.qty,
					item: item,
				});
			});
		}
	}

	prepare_menu() {
		this.page.clear_menu();

		this.page.add_menu_item(
			__("Open Form View"),
			this.open_form_view.bind(this),
			false,
			"Ctrl+F",
		);
	}

	prepare_fullscreen_btn() {
		this.page.page_actions.find(".custom-actions").empty();

		this.page.add_button(__("Full Screen"), null, {
			btn_class: "btn-default fullscreen-btn",
		});

		this.bind_fullscreen_events();
	}

	bind_fullscreen_events() {
		this.$fullscreen_btn = this.page.page_actions.find(".fullscreen-btn");

		this.$fullscreen_btn.on("click", function () {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		});

		$(document).on(
			"fullscreenchange",
			this.handle_fullscreen_change_event.bind(this),
		);
	}

	handle_fullscreen_change_event() {
		let enable_fullscreen_label = __("Full Screen");
		let exit_fullscreen_label = __("Exit Full Screen");

		if (document.fullscreenElement) {
			this.$fullscreen_btn[0].innerText = exit_fullscreen_label;
		} else {
			this.$fullscreen_btn[0].innerText = enable_fullscreen_label;
		}
	}

	open_form_view() {
		frappe.model.sync(this.frm.doc);
		frappe.set_route("Form", this.frm.doc.doctype, this.frm.doc.name);
	}

	toggle_recent_order() {
		const show = this.recent_order_list.$component.is(":hidden");
		this.toggle_recent_order_list(show);
	}

	save_draft_invoice() {
		if (!this.$components_wrapper.is(":visible")) return;

		if (this.frm.doc.items.length == 0) {
			frappe.show_alert({
				message: __(
					"You must add atleast one item to save it as draft.",
				),
				indicator: "red",
			});
			frappe.utils.play_sound("error");
			return;
		}

		this.frm
			.save(undefined, undefined, undefined, () => {
				frappe.show_alert({
					message: __("There was an error saving the document."),
					indicator: "red",
				});
				frappe.utils.play_sound("error");
			})
			.then(() => {
				frappe.run_serially([
					() => frappe.dom.freeze(),
					() => this.make_new_invoice(),
					() => frappe.dom.unfreeze(),
				]);
			});
	}

	close_pos() {
		// if (!this.$components_wrapper.is(":visible")) return;
		// let voucher = frappe.model.get_new_doc("POS Closing Entry");
		// voucher.pos_profile = this.frm.doc.pos_profile;
		// voucher.user = frappe.session.user;
		// voucher.company = this.frm.doc.company;
		// voucher.pos_opening_entry = this.pos_opening;
		// voucher.period_end_date = frappe.datetime.now_datetime();
		// voucher.posting_date = frappe.datetime.now_date();
		// voucher.posting_time = frappe.datetime.now_time();
		// frappe.set_route("Form", "POS Closing Entry", voucher.name);
	}

	init_item_selector() {
		this.item_selector = new edp_online_vehicles.PartOrder.ItemSelector({
			wrapper: this.$components_wrapper,
			pos_profile: this.pos_profile,
			settings: this.settings,
			events: {
				item_selected: (args) => this.on_cart_update(args),

				get_frm: () => this.frm || {},
			},
		});
	}

	init_item_cart() {
		this.cart = new edp_online_vehicles.PartOrder.ItemCart({
			wrapper: this.$components_wrapper,
			settings: this.settings,
			events: {
				get_frm: () => this.frm,

				cart_item_clicked: (item) => {
					const item_row = this.get_item_from_frm(item);
					this.item_details.toggle_item_details_section(item_row);
				},

				numpad_event: (value, action) =>
					this.update_item_field(value, action),

				checkout: () => this.save_and_checkout(),

				edit_cart: () => this.payment.edit_cart(),

				customer_details_updated: (details) => {
					this.item_selector.load_items_data();
					this.customer_details = details;
					// will add/remove LP payment method
					this.payment.render_loyalty_points_payment_mode();
				},
			},
		});
	}

	init_item_details() {
		this.item_details = new edp_online_vehicles.PartOrder.ItemDetails({
			wrapper: this.$components_wrapper,
			settings: this.settings,
			events: {
				get_frm: () => this.frm,

				toggle_item_selector: (minimize) => {
					this.item_selector.resize_selector(minimize);
					this.cart.toggle_numpad(minimize);
				},

				form_updated: (item, field, value) => {
					const item_row = frappe.model.get_doc(
						item.doctype,
						item.name,
					);
					if (item_row && item_row[field] != value) {
						const args = {
							field,
							value,
							item: this.item_details.current_item,
						};

						return this.on_cart_update(args);
					}

					return Promise.resolve();
				},

				highlight_cart_item: (item) => {
					const cart_item = this.cart.get_cart_item(item);
					this.cart.toggle_item_highlight(cart_item);
				},

				item_field_focused: (fieldname) => {
					this.cart.toggle_numpad_field_edit(fieldname);
				},
				set_value_in_current_cart_item: (selector, value) => {
					this.cart.update_selector_value_in_cart_item(
						selector,
						value,
						this.item_details.current_item,
					);
				},
				clone_new_batch_item_in_frm: (batch_serial_map, item) => {
					// called if serial nos are 'auto_selected' and if those serial nos belongs to multiple batches
					// for each unique batch new item row is added in the form & cart
					Object.keys(batch_serial_map).forEach((batch) => {
						const item_to_clone = this.frm.doc.items.find(
							(i) => i.name == item.name,
						);
						const new_row = this.frm.add_child("items", {
							...item_to_clone,
						});
						// update new serialno and batch
						new_row.batch_no = batch;
						new_row.serial_no = batch_serial_map[batch].join(`\n`);
						new_row.qty = batch_serial_map[batch].length;
						this.frm.doc.items.forEach((row) => {
							if (item.item_code === row.item_code) {
								this.update_cart_html(row);
							}
						});
					});
				},
				remove_item_from_cart: () => this.remove_item_from_cart(),
				get_item_stock_map: () => this.item_stock_map,
				close_item_details: () => {
					this.item_details.toggle_item_details_section(null);
					this.cart.prev_action = null;
					this.cart.toggle_item_highlight();
				},
				get_available_stock: (item_code, warehouse) =>
					this.get_available_stock(item_code, warehouse),
			},
		});
	}

	init_payments() {
		this.payment = new edp_online_vehicles.PartOrder.Payment({
			wrapper: this.$components_wrapper,
			events: {
				get_frm: () => this.frm || {},

				get_customer_details: () => this.customer_details || {},

				toggle_other_sections: (show) => {
					if (show) {
						this.item_details.$component.is(":visible")
							? this.item_details.$component.css(
									"display",
									"none",
								)
							: "";
						this.item_selector.toggle_component(false);
					} else {
						this.item_selector.toggle_component(true);
					}
				},

				submit_invoice: () => {
					this.frm.savesubmit().then((r) => {
						this.toggle_components(false);
						this.order_summary.toggle_component(true);
						this.order_summary.load_summary_of(this.frm.doc, true);
						frappe.show_alert({
							indicator: "green",
							message: __("Part Order {0} created succesfully", [
								r.doc.name,
							]),
						});
					});
				},
			},
		});
	}

	init_recent_order_list() {
		this.recent_order_list =
			new edp_online_vehicles.PartOrder.PastOrderList({
				wrapper: this.$components_wrapper,
				events: {
					open_invoice_data: (name) => {
						frappe.db.get_doc("Part Order", name).then((doc) => {
							this.order_summary.load_summary_of(doc);
						});
					},
					reset_summary: () =>
						this.order_summary.toggle_summary_placeholder(true),
				},
			});
	}

	init_order_summary() {
		this.order_summary = new edp_online_vehicles.PartOrder.PastOrderSummary(
			{
				wrapper: this.$components_wrapper,
				events: {
					get_frm: () => this.frm,

					process_return: (name) => {
						this.recent_order_list.toggle_component(false);
						frappe.db.get_doc("Part Order", name).then((doc) => {
							frappe.run_serially([
								() => this.make_return_invoice(doc),
								() => this.cart.load_invoice(),
								() => this.item_selector.toggle_component(true),
							]);
						});
					},
					edit_order: (name) => {
						this.recent_order_list.toggle_component(false);
						frappe.run_serially([
							() => this.frm.refresh(name),
							() => this.frm.call("reset_mode_of_payments"),
							() => this.cart.load_invoice(),
							() => this.item_selector.toggle_component(true),
						]);
					},
					delete_order: (name) => {
						frappe.model.delete_doc(
							this.frm.doc.doctype,
							name,
							() => {
								this.recent_order_list.refresh_list();
							},
						);
					},
					new_order: () => {
						frappe.run_serially([
							() => frappe.dom.freeze(),
							() => this.make_new_invoice(),
							() => this.item_selector.toggle_component(true),
							() => frappe.dom.unfreeze(),
						]);
					},
				},
				pos_profile: this.pos_profile,
			},
		);
	}

	toggle_recent_order_list(show) {
		this.toggle_components(!show);
		this.recent_order_list.toggle_component(show);
		this.order_summary.toggle_component(show);
	}

	toggle_components(show) {
		this.cart.toggle_component(show);
		this.item_selector.toggle_component(show);

		// do not show item details or payment if recent order is toggled off
		!show
			? this.item_details.toggle_component(false) ||
				this.payment.toggle_component(false)
			: "";
	}

	make_new_invoice() {
		return frappe.run_serially([
			() => frappe.dom.freeze(),
			() => this.make_sales_invoice_frm(),
			() => this.set_pos_profile_data(),
			() => this.set_pos_profile_status(),
			() => this.cart.load_invoice(),
			() => frappe.dom.unfreeze(),
		]);
	}

	make_sales_invoice_frm() {
		const doctype = "Part Order";
		return new Promise((resolve) => {
			if (this.frm) {
				this.frm = this.get_new_frm(this.frm);
				this.frm.doc.table_avsu = [];
				resolve();
			} else {
				frappe.model.with_doctype(doctype, () => {
					this.frm = this.get_new_frm();
					this.frm.doc.items = [];
					this.frm.doc.is_pos = 1;
					resolve();
				});
			}
		});
	}

	get_new_frm(_frm) {
		const doctype = "Part Order";
		const page = $("<div>");
		const frm = _frm || new frappe.ui.form.Form(doctype, page, false);
		const name = frappe.model.make_new_doc_and_get_name(doctype, true);
		frm.refresh(name);

		return frm;
	}

	async make_return_invoice(doc) {
		frappe.dom.freeze();
		this.frm = this.get_new_frm(this.frm);
		this.frm.doc.items = [];
		return frappe.call({
			method: "erpnext.accounts.doctype.pos_invoice.pos_invoice.make_sales_return",
			args: {
				source_name: doc.name,
				target_doc: this.frm.doc,
			},
			callback: (r) => {
				frappe.model.sync(r.message);
				frappe.get_doc(
					r.message.doctype,
					r.message.name,
				).__run_link_triggers = false;
				this.set_pos_profile_data().then(() => {
					frappe.dom.unfreeze();
				});
			},
		});
	}

	set_pos_profile_data() {
		if (this.company && !this.frm.doc.company)
			this.frm.doc.company = this.company;
		if (
			(this.pos_profile && !this.frm.doc.pos_profile) |
			(this.frm.doc.is_return &&
				this.pos_profile != this.frm.doc.pos_profile)
		) {
			this.frm.doc.pos_profile = this.pos_profile;
		}

		if (!this.frm.doc.company) return;

		return this.frm.trigger("set_pos_data");
	}

	set_pos_profile_status() {
		// this.page.set_indicator(this.pos_profile, "blue");
	}

	async on_cart_update(args) {
		console.log(args);

		frappe.dom.freeze();
		if (this.frm.doc.set_warehouse != this.settings.warehouse)
			this.frm.doc.set_warehouse = this.settings.warehouse;
		let item_row = undefined;
		try {
			let { field, value, item } = args;
			let { dealer_company } = item;

			if (dealer_company == undefined) {
				let { dealer } = item;
				dealer_company = dealer;
			}

			// Function to find an item row with the same part_no and dealer
			const find_item_row = (part_no, dealer) => {
				return this.frm.doc.table_avsu.find(
					(row) => row.part_no === part_no && row.dealer === dealer,
				);
			};

			// Attempt to find an existing item row with the same part_no and dealer
			item_row = find_item_row(item.part_no, dealer_company);

			const item_row_exists = item_row !== undefined;

			const from_selector = field === "qty" && value === "+1";
			if (from_selector) value = flt(item_row?.qty || 0) + flt(value);

			if (item_row_exists) {
				if (item.dealer_ordered_qty > 0) {
					if (field === "qty")
						value += flt(item.dealer_ordered_qty) - 1;
				} else {
					if (field === "qty") value = flt(value);
				}

				if (
					["qty", "conversion_factor"].includes(field) &&
					value > 0 &&
					!this.allow_negative_stock
				) {
					const qty_needed =
						field === "qty"
							? value * item_row.conversion_factor
							: item_row.qty * value;
					await this.check_stock_availability(
						item_row,
						qty_needed,
						this.frm.doc.set_warehouse,
					);
				}

				if (
					this.is_current_item_being_edited(item_row) ||
					from_selector
				) {
					await frappe.model.set_value(
						item_row.doctype,
						item_row.name,
						field,
						value,
					);
					this.update_cart_html(item_row);
				}
			} else {
				let {
					part_no,
					batch_no,
					serial_no,
					uom,
					rate,
					stock_uom,
					item_name,
					item_image,
					dealer_ordered_qty,
					backorder,
					dealer_billing_excl,
					status,
					image,
					description,
					parenttype,
					part,
					qty,
					price,
				} = item;

				if (!part_no) {
					part_no = part;

					if (!part_no) return;
				}

				if (rate == undefined || rate == 0) {
					if (
						dealer_billing_excl == undefined ||
						dealer_billing_excl == 0
					) {
						if (price == undefined || price == 0) {
							frappe.show_alert({
								message: __("Price is not set for the item."),
								indicator: "orange",
							});
							frappe.utils.play_sound("error");
							return;
						}
					}
				}

				if (description == undefined || description == "") {
					description = item_name;
				}
				let new_item = {};
				let order_from = "";
				let dealer = dealer_company || "";

				if (status == "Declined") {
					await frappe.call({
						method: "edp_online_vehicles.events.get_hq_company.get_hq_company",
						callback: function (r) {
							if (r.message) {
								backorder = true;
								item_image = image;
								order_from = "BackOrder";
								dealer = r.message;
								dealer_ordered_qty = value;
								new_item = {
									part_no,
									description,
									[field]: value,
									item_image,
									order_from,
									backorder,
									dealer,
									dealer_ordered_qty,
								};
							}
						},
					});
				} else {
					if (parenttype == "Catalogue") {
						await frappe.call({
							method: "edp_online_vehicles.events.get_hq_company.get_data_for_catalogue",
							args: {
								part_no: part,
							},
							callback: function (r) {
								if (r.message) {
									dealer = r.message[0];
									backorder = false;
									item_image = r.message[1];
									order_from = "Warehouse";
									part_no = part;

									new_item = {
										part_no,
										description,
										[field]: qty,
										item_image,
										order_from,
										backorder,
										dealer,
										dealer_ordered_qty,
									};
								}
							},
						});
					} else {
						if (dealer_ordered_qty > 0) {
							if (backorder) {
								order_from = "BackOrder";
								new_item = {
									part_no,
									description,
									[field]: dealer_ordered_qty,
									item_image,
									dealer_ordered_qty,
									order_from,
									backorder,
									dealer,
								};
							} else {
								order_from = "Dealer";
								new_item = {
									part_no,
									description,
									[field]: dealer_ordered_qty,
									item_image,
									dealer_ordered_qty,
									order_from,
									dealer,
								};
							}
						} else {
							order_from = "Warehouse";
							new_item = {
								part_no,
								description,
								[field]: value,
								item_image,
								dealer_ordered_qty,
								rate,
								order_from,
								dealer,
							};
						}
					}
				}

				if (serial_no) {
					await this.check_serial_no_availablilty(
						part_no,
						this.frm.doc.set_warehouse,
						serial_no,
					);
					new_item["serial_no"] = serial_no;
				}

				if (field === "serial_no")
					new_item["qty"] = value.split(`\n`).length || 0;

				item_row = this.frm.add_child("table_avsu", new_item);

				console.log(item_row);

				if (
					field === "qty" &&
					value !== 0 &&
					!this.allow_negative_stock
				) {
					const qty_needed = value * item_row.conversion_factor;
					await this.check_stock_availability(
						item_row,
						qty_needed,
						this.frm.doc.set_warehouse,
					);
				}

				await this.trigger_new_item_events(item_row);

				this.update_cart_html(item_row);

				if (this.item_details.$component.is(":visible"))
					this.edit_item_details_of(item_row);

				if (
					this.check_serial_batch_selection_needed(item_row) &&
					!this.item_details.$component.is(":visible")
				)
					this.edit_item_details_of(item_row);
			}
		} catch (error) {
			console.log(error);
		} finally {
			frappe.dom.unfreeze();
		}
		return item_row;
	}

	raise_customer_selection_alert() {
		frappe.dom.unfreeze();
		frappe.show_alert({
			message: __("You must select a customer before adding an item."),
			indicator: "orange",
		});
		frappe.utils.play_sound("error");
	}

	get_item_from_frm({ name, part_no, batch_no, uom, rate }) {
		let item_row = null;
		if (name) {
			item_row = this.frm.doc.table_avsu.find((i) => i.name == name);
		} else {
			// if item is clicked twice from item selector
			// then "part_no, batch_no, uom, rate" will help in getting the exact item
			// to increase the qty by one

			item_row = this.frm.doc.table_avsu.find(
				(i) =>
					i.part_no === part_no &&
					i.dealer_billing_excl === flt(rate),
			);
		}

		return item_row || {};
	}

	edit_item_details_of(item_row) {
		this.item_details.toggle_item_details_section(item_row);
	}

	is_current_item_being_edited(item_row) {
		return item_row.name == this.item_details.current_item.name;
	}

	async update_cart_html(item_row, remove_item) {
		if (remove_item) {
			await this.trigger_new_item_events(item_row, remove_item);
		}

		this.cart.update_item_html(item_row, remove_item);
		this.cart.update_totals_section(this.frm);
	}

	check_serial_batch_selection_needed(item_row) {
		// right now item details is shown for every type of item.
		// if item details is not shown for every item then this fn will be needed
		const serialized = item_row.has_serial_no;
		const batched = item_row.has_batch_no;
		const no_serial_selected = !item_row.serial_no;
		const no_batch_selected = !item_row.batch_no;

		if (
			(serialized && no_serial_selected) ||
			(batched && no_batch_selected) ||
			(serialized && batched && (no_batch_selected || no_serial_selected))
		) {
			return true;
		}
		return false;
	}

	async trigger_new_item_events(item_row, remove_item) {
		if (remove_item) {
			await this.frm.script_manager.trigger(
				"recalculate_totals",
				this.frm.doc.doctype,
				this.frm.doc.name,
			);
			await this.frm.script_manager.trigger(
				"total_excl",
				this.frm.doc.doctype,
				this.frm.doc.name,
			);
		} else {
			await this.frm.script_manager.trigger(
				"part_no",
				item_row.doctype,
				item_row.name,
			);
			await this.frm.script_manager.trigger(
				"total_excl",
				item_row.doctype,
				item_row.name,
			);
			await this.frm.script_manager.trigger(
				"total_excl",
				this.frm.doc.doctype,
				this.frm.doc.name,
			);
			await this.frm.script_manager.trigger(
				"qty",
				item_row.doctype,
				item_row.name,
			);
		}
	}

	async check_stock_availability(item_row, qty_needed, warehouse) {
		// const resp = (await this.get_available_stock(item_row.part_no, warehouse)).message;
		// const available_qty = resp[0];
		// const is_stock_item = resp[1];
		// frappe.dom.unfreeze();
		// // const bold_uom = item_row.stock_uom.bold();
		// const bold_item_code = item_row.part_no.bold();
		// const bold_warehouse = warehouse.bold();
		// const bold_available_qty = available_qty.toString().bold();
		// if (!(available_qty > 0)) {
		// 	if (is_stock_item) {
		// 		frappe.model.clear_doc(item_row.doctype, item_row.name);
		// 		frappe.throw({
		// 			title: __("Not Available"),
		// 			message: __("Item Code: {0} is not available under warehouse {1}.", [
		// 				bold_item_code,
		// 				bold_warehouse,
		// 			]),
		// 		});
		// 	} else {
		// 		return;
		// 	}
		// } else if (is_stock_item && available_qty < qty_needed) {
		// 	frappe.throw({
		// 		message: __(
		// 			"Stock quantity not enough for Item Code: {0} under warehouse {1}. Available quantity {2} {3}.",
		// 			[bold_item_code, bold_warehouse, bold_available_qty, bold_uom]
		// 		),
		// 		indicator: "orange",
		// 	});
		// 	frappe.utils.play_sound("error");
		// }
		// frappe.dom.freeze();
	}

	async check_serial_no_availablilty(item_code, warehouse, serial_no) {
		const method =
			"erpnext.stock.doctype.serial_no.serial_no.get_pos_reserved_serial_nos";
		const args = { filters: { item_code, warehouse } };
		const res = await frappe.call({ method, args });

		if (res.message.includes(serial_no)) {
			frappe.throw({
				title: __("Not Available"),
				message: __(
					"Serial No: {0} has already been transacted into another Part Order.",
					[serial_no.bold()],
				),
			});
		}
	}

	get_available_stock(item_code, warehouse) {
		const me = this;
		return frappe.call({
			method: "erpnext.accounts.doctype.pos_invoice.pos_invoice.get_stock_availability",
			args: {
				item_code: item_code,
				warehouse: warehouse,
			},
			callback(res) {
				if (!me.item_stock_map[item_code])
					me.item_stock_map[item_code] = {};
				me.item_stock_map[item_code][warehouse] = res.message;
			},
		});
	}

	update_item_field(value, field_or_action) {
		if (field_or_action === "checkout") {
			this.item_details.toggle_item_details_section(null);
		} else if (field_or_action === "remove") {
			this.remove_item_from_cart();
		} else {
			const field_control =
				this.item_details[`${field_or_action}_control`];
			if (!field_control) return;
			field_control.set_focus();
			value != "" && field_control.set_value(value);
		}
	}

	remove_item_from_cart() {
		frappe.dom.freeze();
		const { doctype, name, current_item } = this.item_details;

		return frappe.model
			.set_value(doctype, name, "qty", 0)
			.then(() => {
				frappe.model.clear_doc(doctype, name);
				this.update_cart_html(current_item, true);
				this.item_details.toggle_item_details_section(null);
				frappe.dom.unfreeze();
			})
			.catch((e) => console.log(e));
	}

	async save_and_checkout() {
		frappe.model.sync(this.frm.doc);
		frappe.set_route("Form", this.frm.doc.doctype, this.frm.doc.name);
	}
};
