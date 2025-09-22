frappe.provide("edp_online_vehicles.PointOfSale");

/* global edp_online_vehicles, onScan */

frappe.pages["point-of-sale-1"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Point of Sale",
		single_column: true,
	});
	frappe.require("point_of_sale.bundle.js", function () {
		wrapper.pos = new edp_online_vehicles.PointOfSale.Controller(wrapper);
		window.cur_pos = wrapper.pos;
	});
};

frappe.pages["point-of-sale-1"].refresh = function (wrapper) {
	if (document.scannerDetectionData) {
		onScan.detachFrom(document);
		wrapper.pos.wrapper.html("");
		wrapper.pos.check_opening_entry();
	}
};
