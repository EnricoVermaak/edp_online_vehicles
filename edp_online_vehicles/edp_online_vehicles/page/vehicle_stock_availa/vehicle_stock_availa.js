/* global edp_online_vehicles */

frappe.pages["vehicle_stock_availa"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Vehicles Stock Availability"),
		single_column: true,
	});
	page.start = 0;

	// Fetch categories and set them as options for the range field
	frappe.db
		.get_list("Vehicle Range", { fields: ["name"] })
		.then((categories) => {
			// Extract names into an array for options
			const model_range_names = [""].concat(
				categories.map((model_range) => model_range.name),
			);

			page.model_range_field = page.add_field({
				fieldname: "model_range",
				label: __("Range"),
				fieldtype: "Select",
				options: model_range_names,
				change: function () {
					page.stock_availability.start = 0;
					page.stock_availability.refresh();
				},
			});

			page.model_field = page.add_field({
				fieldname: "model",
				label: __("Model"),
				fieldtype: "Link",
				options: "Model Administration",
				change: function () {
					page.stock_availability.start = 0;
					page.stock_availability.refresh();
				},
			});
		});

	frappe.require("stock_availability.bundle.js", function () {
		page.stock_availability =
			new edp_online_vehicles.edp_online_vehicles_mahindrasa.StockAvailability({
				parent: page.main,
				method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.stock_availability.get_data",
				template: "stock_availability_list",
			});

		page.stock_availability.before_refresh = function () {
			if (page.model_range_field) {
				this.model_range = page.model_range_field.get_value();
			} else {
				this.model_range = "";
			}

			if (page.model_field) {
				this.model = page.model_field.get_value();
			} else {
				this.model = "";
			}
		};

		page.stock_availability.refresh();
	});
};
