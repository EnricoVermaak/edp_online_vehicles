frappe.listview_settings["Vehicles Recon"] = {
	add_fields: ["status"],
	has_indicator_for_draft: true,

	get_indicator: function (doc) {
		if (doc.status === "Pending") {
			return [__("Pending"), "orange", "status,=,Pending"];
		} else if (doc.status === "Completed") {
			return [__("Completed"), "green", "status,=,Completed"];
		}
	},
};
