frappe.listview_settings["Vehicle Tracking"] = {
	onload: function (listview) {
		var btn = listview.page.add_inner_button(
			__("Resubmit Failed Requests"),
			function () {
				const selected_docs = listview.get_checked_items();

				if (selected_docs.length === 0) {
					frappe.msgprint(__("Please select at least one document."));
					return;
				}

				// frm.call("resubmit_failed_requests")
			},
		);
	},
};
