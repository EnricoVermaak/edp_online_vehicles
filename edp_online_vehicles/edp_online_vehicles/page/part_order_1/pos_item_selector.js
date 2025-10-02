import onScan from "onscan.js";

/* global edp_online_vehicles */

edp_online_vehicles.PartOrder.ItemSelector = class {
	// eslint-disable-next-line no-unused-vars
	constructor({ frm, wrapper, events, pos_profile, settings }) {
		this.wrapper = wrapper;
		this.events = events;
		this.pos_profile = "";
		this.hide_images = false;
		this.auto_add_item = false;

		this.inti_component();
	}

	inti_component() {
		this.prepare_dom();
		this.make_search_bar();
		this.load_items_data();
		this.bind_events();
		this.attach_shortcuts();
	}

	prepare_dom() {
		this.wrapper.append(
			`<section class="items-selector">
				<div class="filter-section">
					<div class="label">${__("All Items")}</div>
					<div class="search-field"></div>
				</div>
				<div class="items-container"></div>
			</section>`,
		);

		this.$component = this.wrapper.find(".items-selector");
		this.$items_container = this.$component.find(".items-container");
	}

	async load_items_data() {
		if (!this.item_group) {
			const res = await frappe.db.get_value(
				"Item Group",
				{ lft: 1, is_group: 1 },
				"name",
			);
			this.parent_item_group = res.message.name;
		}
		if (!this.price_list) {
			const company = await frappe.defaults.get_user_defaults("Company");
			const res = await frappe.db.get_value(
				"Company",
				company[0],
				"custom_default_price_list",
			);
			this.price_list = res.message.custom_default_price_list;
		}

		this.get_items({}).then(({ message }) => {
			this.render_item_list(message.items);
		});
	}

	get_items({ start = 0, page_length = 40, search_term = "" }) {
		const doc = this.events.get_frm().doc;
		const price_list = (doc && doc.selling_price_list) || this.price_list;
		let item_group = "Parts";

		console.log(this);
		console.log(price_list);

		// !item_group && (item_group = this.parent_item_group);

		return frappe.call({
			method: "edp_online_vehicles.edp_online_vehicles.page.part_order_1.point_of_sale.get_items",
			freeze: true,
			args: { start, page_length, price_list, item_group, search_term },
		});
	}

	render_item_list(items) {
		this.$items_container.html("");

		console.log(items);

		items.forEach((item) => {
			const item_html = this.get_item_html(item);
			this.$items_container.append(item_html);
		});
	}

	get_item_html(item) {
		const me = this;

		// eslint-disable-next-line no-unused-vars
		const {
			item_image,
			serial_no,
			batch_no,
			barcode,
			actual_qty,
			uom,
			price_list_rate,
		} = item;
		const precision = flt(price_list_rate, 2) % 1 != 0 ? 2 : 0;
		let indicator_color;
		let qty_to_display = actual_qty;

		if (item.is_stock_item) {
			indicator_color =
				actual_qty > 10 ? "green" : actual_qty <= 0 ? "red" : "orange";

			if (Math.round(qty_to_display) > 999) {
				qty_to_display = Math.round(qty_to_display) / 1000;
				qty_to_display = qty_to_display.toFixed(1) + "K";
			}
		} else {
			indicator_color = "";
			qty_to_display = "";
		}

		function get_item_image_html() {
			if (actual_qty == 0 && item.dealer_qty > 0) {
				if (!me.hide_images && item_image) {
					return `<div class="item-qty-pill">
								<span class="indicator-pill whitespace-nowrap orange">Dealer - ${item.dealer_qty}</span>
							</div>
							<div class="flex items-center justify-center border-b-grey text-6xl text-grey-100" style="height:8rem; min-height:8rem">
								<img
									onerror="cur_pos.item_selector.handle_broken_image(this)"
									class="h-full item-img" src="${item_image}"
									alt="${frappe.get_abbr(item.item_name)}"
								>
							</div>`;
				} else {
					return `<div class="item-qty-pill">
								<span class="indicator-pill whitespace-nowrap orange">Dealer</span>
							</div>
							<div class="item-display abbr">${frappe.get_abbr(item.item_name)}</div>`;
				}
			} else if (actual_qty == 0 && item.dealer_qty == 0) {
				if (!me.hide_images && item_image) {
					return `<div class="item-qty-pill">
								<span class="indicator-pill whitespace-nowrap red">No Stock</span>
							</div>
							<div class="flex items-center justify-center border-b-grey text-6xl text-grey-100" style="height:8rem; min-height:8rem">
								<img
									onerror="cur_pos.item_selector.handle_broken_image(this)"
									class="h-full item-img" src="${item_image}"
									alt="${frappe.get_abbr(item.item_name)}"
								>
							</div>`;
				} else {
					return `<div class="item-qty-pill">
								<span class="indicator-pill whitespace-nowrap red">No Stock</span>
							</div>
							<div class="item-display abbr">${frappe.get_abbr(item.item_name)}</div>`;
				}
			}

			if (!me.hide_images && item_image) {
				return `<div class="item-qty-pill">
							<span class="indicator-pill whitespace-nowrap green">HQ - ${actual_qty}</span>
						</div>
						<div class="flex items-center justify-center border-b-grey text-6xl text-grey-100" style="height:8rem; min-height:8rem">
							<img
								onerror="cur_pos.item_selector.handle_broken_image(this)"
								class="h-full item-img" src="${item_image}"
								alt="${frappe.get_abbr(item.item_name)}"
							>
						</div>`;
			} else {
				return `<div class="item-qty-pill">
							<span class="indicator-pill whitespace-nowrap green">HQ</span>
						</div>
						<div class="item-display abbr">${frappe.get_abbr(item.item_name)}</div>`;
			}
		}

		return `<div class="item-wrapper"
				data-item-code="${escape(item.item_code)}" data-serial-no="${escape(serial_no)}"
				data-hq-qty="${escape(actual_qty)}" data-dealer-qty="${escape(item.dealer_qty)}"
				data-batch-no="${escape(batch_no)}" data-uom="${escape(uom)}"
				data-rate="${escape(price_list_rate || 0)}"
				data-stock-uom="${escape(item.stock_uom)}"
				data-stock-image="${escape(item_image)}"
				title="${item.item_name}">

				${get_item_image_html()}

				<div class="item-detail">
					<div class="item-name">
						${frappe.ellipsis(item.item_name, 18)}
					</div>
					<div class="item-rate">${
						format_currency(
							price_list_rate,
							item.currency,
							precision,
						) || 0
					} / ${uom}</div>
				</div>
			</div>`;
	}

	handle_broken_image($img) {
		const item_abbr = $($img).attr("alt");
		$($img)
			.parent()
			.replaceWith(`<div class="item-display abbr">${item_abbr}</div>`);
	}

	make_search_bar() {
		const me = this;
		this.$component.find(".search-field").html("");
		// this.$component.find(".item-group-field").html("");

		this.search_field = frappe.ui.form.make_control({
			df: {
				label: __("Search"),
				fieldtype: "Data",
				placeholder: __(
					"Search by item code, serial number or barcode",
				),
			},
			parent: this.$component.find(".search-field"),
			render_input: true,
		});
		// this.item_group_field = frappe.ui.form.make_control({
		// 	df: {
		// 		label: __("Item Group"),
		// 		fieldtype: "Link",
		// 		options: "Item Group",
		// 		placeholder: __("Select item group"),
		// 		onchange: function () {
		// 			me.item_group = this.value;
		// 			!me.item_group && (me.item_group = me.parent_item_group);
		// 			me.filter_items();
		// 		},
		// 		get_query: function () {
		// 			const doc = me.events.get_frm().doc;
		// 			return {
		// 				query: "erpnext.selling.page.point_of_sale.point_of_sale.item_group_query",
		// 				filters: {
		// 					pos_profile: doc ? doc.pos_profile : "",
		// 				},
		// 			};
		// 		},
		// 	},
		// 	parent: this.$component.find(".item-group-field"),
		// 	render_input: true,
		// });
		this.search_field.toggle_label(false);
		// this.item_group_field.toggle_label(false);

		this.attach_clear_btn();
	}

	attach_clear_btn() {
		this.search_field.$wrapper.find(".control-input").append(
			`<span class="link-btn" style="top: 2px;">
				<a class="btn-open no-decoration" title="${__("Clear")}">
					${frappe.utils.icon("close", "sm")}
				</a>
			</span>`,
		);

		this.$clear_search_btn = this.search_field.$wrapper.find(".link-btn");

		this.$clear_search_btn.on("click", "a", () => {
			this.set_search_value("");
			this.search_field.set_focus();
		});
	}

	set_search_value(value) {
		$(this.search_field.$input[0]).val(value).trigger("input");
	}

	bind_events() {
		const me = this;
		window.onScan = onScan;

		onScan.decodeKeyEvent = function (oEvent) {
			var iCode = this._getNormalizedKeyNum(oEvent);
			switch (true) {
				case iCode >= 48 && iCode <= 90: // numbers and letters
				case iCode >= 106 && iCode <= 111: // operations on numeric keypad (+, -, etc.)
				case (iCode >= 160 && iCode <= 164) || iCode == 170: // ^ ! # $ *
				case iCode >= 186 && iCode <= 194: // (; = , - . / `)
				case iCode >= 219 && iCode <= 222: // ([ \ ] ')
				case iCode == 32: // spacebar
					if (oEvent.key !== undefined && oEvent.key !== "") {
						return oEvent.key;
					}

					var sDecoded = String.fromCharCode(iCode);
					switch (oEvent.shiftKey) {
						case false:
							sDecoded = sDecoded.toLowerCase();
							break;
						case true:
							sDecoded = sDecoded.toUpperCase();
							break;
					}
					return sDecoded;
				case iCode >= 96 && iCode <= 105: // numbers on numeric keypad
					return 0 + (iCode - 96);
			}
			return "";
		};

		onScan.attachTo(document, {
			onScan: (sScancode) => {
				if (this.search_field && this.$component.is(":visible")) {
					this.search_field.set_focus();
					this.set_search_value(sScancode);
					this.barcode_scanned = true;
				}
			},
		});

		this.$component.on("click", ".item-wrapper", async function () {
			const $item = $(this);
			const part_no = unescape($item.attr("data-item-code"));
			let batch_no = unescape($item.attr("data-batch-no"));
			let serial_no = unescape($item.attr("data-serial-no"));
			let uom = unescape($item.attr("data-uom"));
			let rate = unescape($item.attr("data-rate"));
			let stock_uom = unescape($item.attr("data-stock-uom"));
			let item_name = unescape($item.attr("title"));
			let item_image = unescape($item.attr("data-stock-image"));
			let hq_qty = unescape($item.attr("data-hq-qty"));
			let dealer_qty = unescape($item.attr("data-dealer-qty"));

			let dealer_ordered_qty = 0;
			let dealer_company = "";
			let backorder = false;

			// Handle undefined values:
			batch_no = batch_no === "undefined" ? undefined : batch_no;
			serial_no = serial_no === "undefined" ? undefined : serial_no;
			uom = uom === "undefined" ? undefined : uom;
			rate = rate === "undefined" ? undefined : rate;
			stock_uom = stock_uom === "undefined" ? undefined : stock_uom;

			// Convert quantities to numbers:
			const hq = parseFloat(hq_qty) || 0;
			const dealer = parseFloat(dealer_qty) || 0;

			// If no HQ stock but dealer stock is available, trigger popup.
			if (hq === 0 && dealer > 0) {
				try {
					let { ordered_qty, company, is_backorder } =
						await showDealerOrderPopup(part_no);

					if (is_backorder) {
						backorder = true;
					}

					dealer_ordered_qty = ordered_qty;
					dealer_company = company;
				} catch (error) {
					return;
				}
			} else if (hq === 0 && dealer === 0) {
				backorder = true;

				await frappe.call({
					method: "edp_online_vehicles.events.get_hq_company.get_hq_company",
					callback: function (r) {
						if (r.message) {
							dealer_company = r.message;
							dealer_ordered_qty = 1;
						}
					},
				});
			}

			// Continue only if user clicks "Order" or if popup was never triggered.
			me.events.item_selected({
				field: "qty",
				value: "+1",
				item: {
					part_no,
					batch_no,
					serial_no,
					uom,
					rate,
					stock_uom,
					item_name,
					item_image,
					dealer_ordered_qty,
					dealer_company,
					backorder,
				},
			});

			me.search_field.set_focus();
		});

		this.search_field.$input.on("input", (e) => {
			clearTimeout(this.last_search);
			this.last_search = setTimeout(() => {
				const search_term = e.target.value;
				this.filter_items({ search_term });
			}, 300);

			this.$clear_search_btn.toggle(
				Boolean(this.search_field.$input.val()),
			);
		});

		this.search_field.$input.on("focus", () => {
			this.$clear_search_btn.toggle(
				Boolean(this.search_field.$input.val()),
			);
		});
	}

	attach_shortcuts() {
		const ctrl_label = frappe.utils.is_mac() ? "⌘" : "Ctrl";
		this.search_field.parent.attr("title", `${ctrl_label}+I`);
		frappe.ui.keys.add_shortcut({
			shortcut: "ctrl+i",
			action: () => this.search_field.set_focus(),
			condition: () => this.$component.is(":visible"),
			description: __("Focus on search input"),
			ignore_inputs: true,
			page: cur_page.page.page,
		});
		// this.item_group_field.parent.attr("title", `${ctrl_label}+G`);
		// frappe.ui.keys.add_shortcut({
		// 	shortcut: "ctrl+g",
		// 	action: () => this.item_group_field.set_focus(),
		// 	condition: () => this.$component.is(":visible"),
		// 	description: __("Focus on Item Group filter"),
		// 	ignore_inputs: true,
		// 	page: cur_page.page.page,
		// });

		// for selecting the last filtered item on search
		frappe.ui.keys.on("enter", () => {
			const selector_is_visible = this.$component.is(":visible");
			if (!selector_is_visible || this.search_field.get_value() === "")
				return;

			if (this.items.length == 1) {
				this.$items_container.find(".item-wrapper").click();
				frappe.utils.play_sound("submit");
				this.set_search_value("");
			} else if (this.items.length == 0 && this.barcode_scanned) {
				// only show alert of barcode is scanned and enter is pressed
				frappe.show_alert({
					message: __("No items found. Scan barcode again."),
					indicator: "orange",
				});
				frappe.utils.play_sound("error");
				this.barcode_scanned = false;
				this.set_search_value("");
			}
		});
	}

	filter_items({ search_term = "" } = {}) {
		const selling_price_list = this.events.get_frm().doc.selling_price_list;

		if (search_term) {
			search_term = search_term.toLowerCase();

			// memoize
			this.search_index = this.search_index || {};
			this.search_index[selling_price_list] =
				this.search_index[selling_price_list] || {};
			if (this.search_index[selling_price_list][search_term]) {
				const items =
					this.search_index[selling_price_list][search_term];
				this.items = items;
				this.render_item_list(items);
				this.auto_add_item &&
					this.items.length == 1 &&
					this.add_filtered_item_to_cart();
				return;
			}
		}

		this.get_items({ search_term }).then(({ message }) => {
			// eslint-disable-next-line no-unused-vars
			const { items, serial_no, batch_no, barcode } = message;
			if (search_term && !barcode) {
				this.search_index[selling_price_list][search_term] = items;
			}
			this.items = items;
			this.render_item_list(items);
			this.auto_add_item &&
				this.items.length == 1 &&
				this.add_filtered_item_to_cart();
		});
	}

	add_filtered_item_to_cart() {
		this.$items_container.find(".item-wrapper").click();
		this.set_search_value("");
	}

	resize_selector(minimize) {
		minimize
			? this.$component
					.find(".filter-section")
					.css("grid-template-columns", "repeat(1, minmax(0, 1fr))")
			: this.$component
					.find(".filter-section")
					.css("grid-template-columns", "repeat(12, minmax(0, 1fr))");

		minimize
			? this.$component
					.find(".search-field")
					.css("margin", "var(--margin-sm) 0px")
			: this.$component
					.find(".search-field")
					.css("margin", "0px var(--margin-sm)");

		minimize
			? this.$component.css("grid-column", "span 2 / span 2")
			: this.$component.css("grid-column", "span 6 / span 6");

		minimize
			? this.$items_container.css(
					"grid-template-columns",
					"repeat(1, minmax(0, 1fr))",
				)
			: this.$items_container.css(
					"grid-template-columns",
					"repeat(4, minmax(0, 1fr))",
				);
	}

	toggle_component(show) {
		this.set_search_value("");
		this.$component.css("display", show ? "flex" : "none");
	}
};

/**
 * Displays a popup when an item is only available in dealer warehouses.
 * Uses a Promise to wait for user action before continuing execution.
 */
function showDealerOrderPopup(part_no) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method: "edp_online_vehicles.events.get_item_details.get_item_details",
			args: { part_no: part_no },
			callback: function (r) {
				if (!r.message || r.message.length === 0) {
					return reject(); // If no dealer stock, reject the Promise
				}

				// Ensure HQ row (allow_backorder: true) is first
				let dealers = r.message;
				dealers.sort((a, b) => {
					if (a.allow_backorder && !b.allow_backorder) {
						return -1;
					}
					return 0;
				});

				// Create overlay to freeze page interactions
				let $overlay = $(
					'<div class="custom-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1999;"></div>',
				);

				// Generate dealer rows dynamically
				let dealerRows = dealers
					.map((dealer) => {
						// For HQ row, do not set a max attribute so that users can order above current SOH.
						let maxAttribute = dealer.allow_backorder
							? ""
							: `max="${dealer.soh}"`;
						return `
                        <div class="dealer-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <div style="flex: 2; text-align: left;">${dealer.company}</div>
                            <div style="flex: 1; text-align: center;">${dealer.soh}</div>
                            <div style="flex: 2; display: flex; align-items: center; justify-content: center;">
                                <button class="qty-minus" data-company="${dealer.company}" style="width: 25px; height: 25px; border: none; background-color: #ccc; cursor: pointer;">-</button>
                                <input type="number" class="qty-input" data-company="${dealer.company}" value="0" min="0" ${maxAttribute} style="width: 40px; text-align: center; margin: 0 5px; border: 1px solid #ccc; border-radius: 3px;">
                                <button class="qty-plus" data-company="${dealer.company}" style="width: 25px; height: 25px; border: none; background-color: #ccc; cursor: pointer;">+</button>
                            </div>
                        </div>
                    `;
					})
					.join("");

				// Create popup HTML
				let $popup = $(`
                    <div class="custom-popup" style="
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 2000;
                        background-color: #fff;
                        color: #000;
                        padding: 20px;
                        border-radius: 4px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                        width: 50%;
                        max-width: 600px;
                        text-align: center;
                    ">
                        <button class="popup-close" style="position: absolute; top: 5px; right: 5px; background: transparent; border: none; font-size: 18px; cursor: pointer; color: #000;">&times;</button>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
                            <div style="flex: 2; text-align: left;">Dealer</div>
                            <div style="flex: 1; text-align: center;">SOH</div>
                            <div style="flex: 2; text-align: center;">Qty</div>
                        </div>
                        ${dealerRows}
                        <button class="order-btn" disabled style="
                            margin-top: 15px;
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            background-color: #056fa6;
                            color: #fff;
                            font-weight: bold;
                            cursor: not-allowed;
                        ">Order</button>
                    </div>
                `);

				// Append overlay and popup to the container
				$(".part-order-app").append($overlay).append($popup);

				// Enable/Disable Order button based on selected qty
				function updateOrderButtonState() {
					let totalQty = 0;
					$(".qty-input").each(function () {
						totalQty += parseInt($(this).val(), 10) || 0;
					});
					$(".order-btn")
						.prop("disabled", totalQty === 0)
						.css(
							"cursor",
							totalQty > 0 ? "pointer" : "not-allowed",
						);
				}

				// Handle "+" button clicks
				$(".qty-plus").click(function () {
					let company = $(this).data("company");
					let $input = $(`.qty-input[data-company='${company}']`);
					// For dealer rows, use the max attribute; for HQ (no max) simply increment.
					let maxQty = $input.attr("max")
						? parseInt($input.attr("max"), 10)
						: null;
					let currentValue = parseInt($input.val(), 10) || 0;
					if (maxQty !== null && currentValue < maxQty) {
						$input.val(currentValue + 1);
					} else if (maxQty === null) {
						$input.val(currentValue + 1);
					}
					updateOrderButtonState();
				});

				// Handle "-" button clicks
				$(".qty-minus").click(function () {
					let company = $(this).data("company");
					let $input = $(`.qty-input[data-company='${company}']`);
					let currentValue = parseInt($input.val(), 10) || 0;
					if (currentValue > 0) {
						$input.val(currentValue - 1);
					}
					updateOrderButtonState();
				});

				// Prevent manual entry beyond limits for non-HQ rows
				$(".qty-input").on("input", function () {
					let maxQty = $(this).attr("max")
						? parseInt($(this).attr("max"), 10)
						: null;
					let value = parseInt($(this).val(), 10) || 0;
					if (maxQty !== null && value > maxQty) {
						$(this).val(maxQty);
					}
					if (value < 0) {
						$(this).val(0);
					}
					updateOrderButtonState();
				});

				// Handle "Order" click → Resolve Promise if at least one qty is > 0
				$(".order-btn").click(function () {
					if ($(this).prop("disabled")) return;

					let totalQty = 0;
					let selectedCompany = "";
					let isBackorder = false;

					$(".qty-input").each(function () {
						let comp = $(this).data("company");
						let qty = parseInt($(this).val(), 10) || 0;
						if (qty > 0 && !selectedCompany) {
							selectedCompany = comp;
							// Check if the selected company allows backorder
							let dealer = dealers.find(
								(d) => d.company === comp,
							);
							if (dealer && dealer.allow_backorder) {
								isBackorder = true;
							}
						}
						totalQty += qty;
					});

					$popup.remove();
					$overlay.remove();
					resolve({
						ordered_qty: totalQty,
						company: selectedCompany,
						is_backorder: isBackorder,
					});
				});

				// Handle "Close" click → Reject Promise
				$(".popup-close").click(function () {
					$popup.remove();
					$overlay.remove();
					reject();
				});
			},
		});
	});
}
