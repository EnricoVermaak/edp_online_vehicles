// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mandatory Fields", {
	refresh: function (frm) {
		frm.set_query("choose_doctype", function () {
			return {
				filters: {
					module: "Edp Online Vehicles",
				},
			};
		});

		if (frm.is_new()) {
			frm.toggle_display("mandatory_fields", false);
		} else {
			frm.toggle_display("mandatory_fields", true);

			let field_names = [];

			frm.fields_dict["mandatory_fields"].grid.update_docfield_property(
				"field_name",
				"options",
				[""].concat(""),
			);

			frappe.call({
				method: "edp_online_vehicles.events.get_field_name_from_doctype.get_fields_from_doctype",
				args: {
					docname: frm.doc.name,
				},
				callback: function (r) {
					field_names = r.message;
					field_names.sort();
					frm.fields_dict[
						"mandatory_fields"
					].grid.update_docfield_property(
						"field_name",
						"options",
						[""].concat(field_names),
					);
					frm.refresh_field("mandatory_fields");
				},
			});
		}
	},
	after_save(frm) {
		frm.start_time = new Date().getTime();

		frappe.call({
			method: "edp_online_vehicles.events.get_field_name_from_doctype.make_fields_mandatory",
			args: {
				docname: frm.doc.choose_doctype,
			},
			callback: function (r) {
				// Capture the end time after saving
				let end_time = new Date().getTime();

				// Calculate the time taken (in seconds)
				let time_taken = (end_time - frm.start_time) / 1000;

				// Show message with the time taken
				frappe.msgprint(
					__(
						"Document saved in " +
							time_taken.toFixed(2) +
							" seconds",
					),
				);

				if (r.message) {
					let fields = r.message;
					fields.forEach((reqd_field) => {
						let child = frm.add_child("mandatory_fields");
						child.field_name = reqd_field;
						frappe.msgprint("Fields successfully updated");
					});
				}
			},
		});
	},
});
