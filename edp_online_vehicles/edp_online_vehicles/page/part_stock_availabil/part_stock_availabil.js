/* global edp_online_vehicles */

frappe.pages["part-stock-availabil"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Part Stock Availability",
		single_column: true,
	});
	page.start = 0;

	page.model_field = page.add_field({
		fieldname: "part",
		label: __("Part"),
		fieldtype: "Link",
		options: "Item",
		link_filters: '[["Item","item_group","=","Parts"]]',
		change: function () {
			page.part_stock_availability.start = 0;
			page.part_stock_availability.refresh();
		},
	});

	frappe.require("part_stock_availability.bundle.js", function () {
		page.part_stock_availability =
			new edp_online_vehicles.edp_online_vehicles_mahindrasa.PartStockAvailability({
				parent: page.main,
				method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.page.part_stock_availabil.part_stock_availability.get_data",
				template: "part_stock_availability_list",
			});

		page.part_stock_availability.before_refresh = function () {};

		page.part_stock_availability.refresh();
	});
};
