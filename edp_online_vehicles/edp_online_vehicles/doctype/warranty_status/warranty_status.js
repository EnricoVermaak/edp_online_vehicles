// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Warranty Status", {
	refresh(frm) {},
	validate: function (frm) {
		if (frm.doc.is_default_status) {
			return new Promise((resolve, reject) => {
				frappe.db
					.get_list("Warranty Status", {
						filters: {
							is_default_status: 1,
						},
						fields: ["name"],
					})
					.then((war_status) => {
						if (war_status.length == 1) {
							frappe.msgprint({
								message:
									"Warranty Status " +
									war_status[0].name +
									" is already set as default. You cannot have two default statuses.",
								title: "Validation Error",
								indicator: "red",
							});
							frm.set_value("is_default_status", 0);

							reject();
						} else {
							resolve();
						}
					});
			});
		}
	},
});
