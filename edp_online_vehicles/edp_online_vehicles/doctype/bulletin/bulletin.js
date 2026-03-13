frappe.ui.form.on("Bulletin", {
	refresh(frm) {
		if (frm.is_new()) return;

		const is_admin =
			frappe.user.has_role("Vehicles Administrator") ||
			frappe.user.has_role("System Manager");

		if (!is_admin) {
			frm.disable_save();
		}

		frappe.call({
			method:
				"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.mark_bulletin_read",
			args: { bulletin_name: frm.doc.name },
			async: true,
		});
	},

	distribute_btn(frm) {
		if (frm.is_dirty()) {
			frappe.msgprint(__("Please save the bulletin before distributing."));
			return;
		}

		frappe.confirm(
			__("Distribute this bulletin to all users with the selected roles?"),
			() => {
				frappe.call({
					method:
						"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.distribute",
					args: { bulletin_name: frm.doc.name },
					freeze: true,
					freeze_message: __("Distributing..."),
					callback() {
						frm.reload_doc();
					},
				});
			}
		);
	},

	resend_btn(frm) {
		frappe.confirm(
			__(
				"Reset all notifications for this bulletin to Unread so recipients must re-acknowledge?"
			),
			() => {
				frappe.call({
					method:
						"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.resend",
					args: { bulletin_name: frm.doc.name },
					freeze: true,
					freeze_message: __("Resending..."),
					callback() {
						frm.reload_doc();
					},
				});
			}
		);
	},

	view_status_btn(frm) {
		frappe.call({
			method:
				"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.get_distribution_status",
			args: { bulletin_name: frm.doc.name },
			freeze: true,
			callback(r) {
				if (!r.message || r.message.length === 0) {
					frappe.msgprint(
						__("No distribution records found. Distribute first.")
					);
					return;
				}

				const rows = r.message;
				const read_count = rows.filter((r) => r.status === "Read").length;
				const unread_count = rows.length - read_count;

				let html = `<div class="mb-3">
					<span class="badge badge-success">${read_count} Read</span>
					<span class="badge badge-warning">${unread_count} Unread</span>
					<span class="text-muted ml-2">${rows.length} total</span>
				</div>`;

				html += `<table class="table table-bordered table-sm">
					<thead><tr>
						<th>${__("User")}</th>
						<th>${__("Full Name")}</th>
						<th>${__("Status")}</th>
					</tr></thead><tbody>`;

				for (const row of rows) {
					const badge =
						row.status === "Read"
							? '<span class="text-success">Read</span>'
							: '<span class="text-warning font-weight-bold">Unread</span>';
					html += `<tr>
						<td>${row.user}</td>
						<td>${row.full_name}</td>
						<td>${badge}</td>
					</tr>`;
				}

				html += "</tbody></table>";

				const d = new frappe.ui.Dialog({
					title: __("Distribution Status"),
					size: "large",
				});
				d.$body.html(html);
				d.show();
			},
		});
	},
});
