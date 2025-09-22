frappe.listview_settings["Model Administration"] = {
	hide_name_column: true,
	hide_name_filter: true,

	// onload: function(listview) {
	//     const default_dealer = frappe.defaults.get_default("company");

	//     listview.page.add_actions_menu_item(__('Delete Docs'), function() {
	//         frappe.call({
	//             method: "edp_online_vehicles.events.delete_docs.delete_docs",
	//             args: {
	//                 doctype: "Model Administration"
	//             }
	//         })
	//     });
	// }
};
