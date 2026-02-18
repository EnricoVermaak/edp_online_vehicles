// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Service Status", {
	refresh(frm) {
		// Refresh logic here if needed
	},
	validate: function (frm) {
		if (frm.doc.is_default_status) {
			return new Promise((resolve, reject) => {
				frappe.db
					.get_list("Service Status", {
						filters: {
							is_default_status: 1,
							name: ["!=", frm.doc.name]
						},
						fields: ["name"],
					})
					.then((serv_status) => {
						if (serv_status.length === 1) {
							frappe.msgprint({
								message:
									"Service Status " +
									serv_status[0].name +
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
	technician_started_job(frm) {
		if (frm.doc.technician_started_job) {
			frappe.db
				.get_list("Service Status", {
					filters: {
						technician_started_job: 1,
					},
					fields: ["name"],
				})
				.then((serv_status) => {
					if (serv_status.length == 1) {
						frappe.msgprint({
							message:
								"Another Status already has Technician Started Job checked.",
							title: "Validation Error",
							indicator: "red",
						});
						frm.set_value("technician_started_job", 0);
					}
				});
		}
	},
	technician_completed_job(frm) {
		if (frm.doc.technician_completed_job) {
			frappe.db
				.get_list("Service Status", {
					filters: {
						technician_completed_job: 1,
					},
					fields: ["name"],
				})
				.then((serv_status) => {
					if (serv_status.length == 1) {
						frappe.msgprint({
							message:
								"Another Status already has Technician Completed Job checked.",
							title: "Validation Error",
							indicator: "red",
						});
						frm.set_value("technician_completed_job", 0);
					}
				});
		}
	},
});