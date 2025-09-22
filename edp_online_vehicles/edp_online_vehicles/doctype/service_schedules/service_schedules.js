// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Service Schedules", {
	onload(frm) {
		frm.set_query("item", "service_parts_items", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});
		frm.set_query("item", "service_labour_items", () => {
			return {
				filters: {
					item_group: "Service Labour",
				},
			};
		});
	},
});
