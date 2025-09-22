frappe.listview_settings["Vehicles Load Test"] = {
	hide_name_column: true,
	hide_name_filter: true, // hide the default filter field for the name column

	add_fields: ["lt_status"],
	get_indicator: function (doc) {
		return [doc.lt_status];
		// if (doc.lt_status == "Pass") {
		//     return [__("Pass"), "green"];
		// }
		// else if (doc.lt_status == "Fail") {
		//     return [__("Fail")];
		// } else {
		//     return [__("Pending"), "grey", ""];
		// }
	},
};
