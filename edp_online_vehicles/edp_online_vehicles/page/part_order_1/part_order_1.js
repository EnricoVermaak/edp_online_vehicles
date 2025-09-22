frappe.provide("edp_online_vehicles.PartOrder");

/* global edp_online_vehicles, onScan */

frappe.pages["part-order-1"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Part Order",
		single_column: true,
	});

	frappe.require("point_of_sale.bundle.js", function () {
		wrapper.po = new edp_online_vehicles.PartOrder.Controller(wrapper);
		window.cur_pos = wrapper.po;
	});
};

frappe.pages["part-order-1"].refresh = function (wrapper) {
	if (document.scannerDetectionData) {
		onScan.detachFrom(document);
		wrapper.pos.wrapper.html("");
		wrapper.pos.check_opening_entry();
	}
};
