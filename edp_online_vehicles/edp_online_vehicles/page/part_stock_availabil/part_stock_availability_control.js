frappe.provide("edp_online_vehicles.edp_online_vehicles");

/* global edp_online_vehicles */

edp_online_vehicles.edp_online_vehicles.PartStockAvailability = class PartStockAvailability {
	constructor(opts) {
		$.extend(this, opts);
		this.make();
	}
	make() {
		var me = this;
		this.start = 0;

		this.content = $(
			frappe.render_template("part_stock_availability"),
		).appendTo(this.parent);
		this.result = this.content.find(".result");

		this.content.on("click", ".btn-order", function () {
			handle_order($(this), "Order");
		});

		function handle_order(element, action) {
			let part = unescape(element.attr("data-part_no"));
			let description = unescape(element.attr("data-part"));

			let selected_items = { part, description };

			if (action === "Order") {
				frappe.route_options = {
					parts: selected_items,
				};

				frappe.set_route("app/part-order-1");
			}
		}
	}
	refresh() {
		if (this.before_refresh) {
			this.before_refresh();
		}

		var me = this;

		// Pass "part" as the parameter instead of model_range/model
		frappe.call({
			method: this.method,
			args: {
				part: this.part || "",
			},
			callback: function (r) {
				me.render(r.message);
			},
		});
	}
	render(data) {
		var me = this;

		if (this.start === 0) {
			this.max_count = 0;
			this.result.empty();
		}

		let context = {};

		// Get the stock data context with overall totals computed from the flat list
		context = this.get_stock_availability_dashboard_data(
			data,
			this.max_count,
			true,
		);

		// Fetch headers from the backend using frappe.call
		frappe.call({
			method: "edp_online_vehicles.edp_online_vehicles.page.part_stock_availabil.get_headers.get_context",
			args: { context: context },
			callback: function (r) {
				if (r.message) {
					context.headers = r.message.headers || [];
					context.hide_unconfirmed_shipments = 0;

					console.log(context);

					if (context.data.length > 0) {
						me.content.find(".result").css("text-align", "unset");
						$(
							frappe.render_template(me.template, context),
						).appendTo(me.result);
					} else {
						var message = __("No Stock Available Currently");
						me.content.find(".result").css("text-align", "center");

						$(`<div class='text-muted' style='margin: 20px 5px;'>
							${message} </div>`).appendTo(me.result);
					}
				}
			},
		});
	}

	get_stock_availability_dashboard_data(data, max_count, show_item) {
		if (!max_count) max_count = 0;
		if (!data) data = [];

		// Initialize overall totals
		let totals = {
			hq_company_total: 0,
			dealers_total: 0,
			pipeline_total: 0,
			unconfirmed_shipments_total: 0,
			models_total: 0,
			date_1_total: 0,
			date_2_total: 0,
			date_3_total: 0,
			date_4_total: 0,
			date_5_total: 0,
			date_6_total: 0,
			date_7_total: 0,
			date_8_total: 0,
			date_9_total: 0,
			date_10_total: 0,
			date_11_total: 0,
			date_12_total: 0,
		};

		// Iterate over each part record to compute totals and individual totals
		data.forEach(function (part) {
			part.total =
				part.hq_company +
				part.dealers +
				part.pipeline +
				part.unconfirmed_shipments;
			totals.hq_company_total += part.hq_company;
			totals.dealers_total += part.dealers;
			totals.pipeline_total += part.pipeline;
			totals.unconfirmed_shipments_total += part.unconfirmed_shipments;
			totals.models_total += part.total;
			max_count = Math.max(max_count, part.total);

			// Sum monthly shipment counts (always numeric)
			for (let i = 1; i <= 12; i++) {
				totals["date_" + i + "_total"] += part["date_" + i];
			}
		});

		return {
			data: data,
			totals: totals,
			max_count: max_count,
			can_write: 1,
			show_item: show_item || false,
		};
	}
};
