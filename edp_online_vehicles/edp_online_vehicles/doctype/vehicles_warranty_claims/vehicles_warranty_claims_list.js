frappe.listview_settings["Vehicles Warranty Claims"] = {
	add_fields: ["status"],
	get_indicator: function (doc) {
		return [doc.status];
	},
};
