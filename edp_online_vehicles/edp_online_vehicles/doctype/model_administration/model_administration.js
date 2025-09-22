// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

var colours = [];

frappe.ui.form.on("Model Administration", {
	refresh(frm) {},
	onload(frm, dt, dn) {
		colours = frm.doc["model_colours"].map((row) => ({
			colour: row.colour,
		}));
	},
	before_save(frm) {
		if (frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.hover_tooltip_data.set_model_admin_image",
				args: {
					model: frm.doc.name,
				},
				callback: function (r) {
					frm.doc.model_default_image = r.message;
				},
			});
		}
	},
});

frappe.ui.form.on("Model Colours", {
	model_colours_remove(frm) {
		// Create a new array from the current state of the model_colours child table
		let updated_colours = frm.doc["model_colours"].map((row) => ({
			colour: row.colour,
		}));

		// Find all removed colors by comparing the original colours array with the updated_colours array
		let removed_colours = colours
			.filter(
				(original) =>
					!updated_colours.some(
						(updated) => updated.colour === original.colour,
					),
			)
			.map((item) => item.colour);

		if (removed_colours.length > 0) {
			console.log("Removed colours:", removed_colours);

			// Call the backend method once with all removed colours
			frappe.call({
				method: "edp_online_vehicles.events.delete_document.delete_model_colours",
				args: {
					colours: JSON.stringify(removed_colours),
					model: frm.doc.name,
				},
				callback: function (r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: `${removed_colours.length} Model Colour(s) successfully deleted`,
								indicator: "green",
							},
							5,
						);
					}
				},
			});
		}

		// Update the colours array to match the updated child table
		colours = updated_colours;
	},
});
