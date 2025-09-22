// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Part Order Type", {
	refresh(frm) {},

	is_default(frm) {
		if (frm.doc.is_default) {
			frappe.call({
				method: "edp_online_vehicles.events.check_status.default_check",
				args: {
					doctype: frm.doc.doctype,
					fieldname: "is_default",
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("is_default", 0);

						frappe.msgprint(
							"You cannot have more than one default status.",
						);
					}
				},
			});
		}
	},
});
