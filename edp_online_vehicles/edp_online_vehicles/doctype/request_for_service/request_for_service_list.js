frappe.listview_settings["Request for Service"] = {
	add_fields: ["rfs_status"],
	get_indicator: function (doc) {
		return [doc.rfs_status];
	},
};
