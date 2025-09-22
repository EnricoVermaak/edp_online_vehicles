frappe.listview_settings["Vehicles Dealer to Dealer Order"] = {
	hide_name_column: true,
	hide_name_filter: true,
	add_fields: ["status"],
	has_indicator_for_draft: true,
	get_indicator: function (doc) {
		if (doc.status === "Approved") {
			return [__("Approved"), "green", "status,=,Approved"];
		} else if (doc.status === "Pending") {
			return [__("Pending"), "orange", "status,=,Pending"];
		} else if (doc.status === "Delivered") {
			return [__("Delivered"), "green", "status,=,Delivered"];
		} else if (doc.status === "Declined") {
			return [__("Declined"), "red", "status,=,Declined"];
		} else if (doc.status === "Cancelled") {
			return [__("Cancelled"), "red", "status,=,Cancelled"];
		}
	},
};
