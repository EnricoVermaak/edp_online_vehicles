// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

var colours = [];

frappe.ui.form.on("Model Administration", {
	refresh(frm) {},
	onload(frm, dt, dn) {
		colours = frm.doc["model_colours"].map((row) => ({
			colour: row.colour,
		}));
        // Track initial state of interior colours child table
        interior_colours = frm.doc["interior_colours"]
            ? frm.doc["interior_colours"].map((row) => ({ colour: row.colour }))
            : [];
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



// Dialog to add exterior model colour
frappe.ui.form.on("Model Administration", {
    add_colour(frm) {
        let d = new frappe.ui.Dialog({
            title: "Add Model Colour",
            fields: [
                {
                    label: "Model",
                    fieldname: "model",
                    fieldtype: "Link",
                    options: "Model Administration",
                    default: frm.doc.name,
                    read_only: 1
                },
                {
                    label: "Colour",
                    fieldname: "colour",
                    fieldtype: "Data",
                    reqd: 1
                },
                { fieldtype: "Section Break" },
                {
                    fieldtype: "Button",
                    label: "Edit Full Form",
                    click() {
                        frappe.model.with_doctype("Model Colour", function() {
                            let doc = frappe.model.get_new_doc("Model Colour");
                            doc.model = d.get_value("model");
                            doc.colour = d.get_value("colour");
                            frappe.set_route("Form", doc.doctype, doc.name);
                        });
                        d.hide();
                    }
                }
            ],
            primary_action_label: "Create",
            primary_action(values) {
                function do_insert() {
                    frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: {
                                doctype: "Model Colour",
                                model: values.model,
                                colour: values.colour
                            }
                        },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.msgprint(`New Model Colour <b>${r.message.name}</b> created`);
                                frm.reload_doc();
                                d.hide();
                            }
                        }
                    });
                }
                if (frm.is_dirty()) {
                    frm.save().then(() => do_insert());
                } else {
                    do_insert();
                }
            }
        });

        d.show();
    }
});


// Dialog to add interior model colour
frappe.ui.form.on("Model Administration", {
    add_interior_colour(frm) {
        let d = new frappe.ui.Dialog({
            title: "Add Interior Model Colour",
            fields: [
                {
                    label: "Model",
                    fieldname: "model",
                    fieldtype: "Link",
                    options: "Model Administration",
                    default: frm.doc.name,
                    read_only: 1
                },
                {
                    label: "Colour",
                    fieldname: "colour",
                    fieldtype: "Data",
                    reqd: 1
                },
                { fieldtype: "Section Break" },
                {
                    fieldtype: "Button",
                    label: "Edit Full Form",
                    click() {
                        frappe.model.with_doctype("Interior Model Colour", function() {
                            let doc = frappe.model.get_new_doc("Interior Model Colour");
                            doc.model = d.get_value("model");
                            doc.colour = d.get_value("colour");
                            frappe.set_route("Form", doc.doctype, doc.name);
                        });
                        d.hide();
                    }
                }
            ],
            primary_action_label: "Create",
            primary_action(values) {
                function do_insert() {
                    frappe.call({
                        method: "frappe.client.insert",
                        args: {
                            doc: {
                                doctype: "Interior Model Colour",
                                model: values.model,
                                colour: values.colour
                            }
                        },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.msgprint(`New Interior Model Colour <b>${r.message.name}</b> created`);
                                frm.reload_doc();
                                d.hide();
                            }
                        }
                    });
                }
                if (frm.is_dirty()) {
                    frm.save().then(() => do_insert());
                } else {
                    do_insert();
                }
            }
        });

        d.show();
    }
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






var interior_colours = [];

frappe.ui.form.on("Model Administration", {
    onload(frm, dt, dn) {
        interior_colours = frm.doc["interior_colours"].map((row) => ({
            colour: row.colour,
        }));
    },
});

frappe.ui.form.on("Interior Model Colours", {
    interior_model_colours_remove(frm) {
        let updated_colours = frm.doc["interior_colours"].map((row) => ({
            colour: row.colour,
        }));

        let removed_colours = interior_colours
            .filter(
                (original) =>
                    !updated_colours.some(
                        (updated) => updated.colour === original.colour,
                    ),
            )
            .map((item) => item.colour);

        if (removed_colours.length > 0) {
            console.log("Removed interior colours:", removed_colours);

            frappe.call({
                method: "edp_online_vehicles.events.delete_document.delete_interior_model_colours",
                args: {
                    colours: JSON.stringify(removed_colours),
                    model: frm.doc.name,
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.show_alert(
                            {
                                message: `${removed_colours.length} Interior Model Colour(s) successfully deleted`,
                                indicator: "green",
                            },
                            5,
                        );
                    }
                },
            });
        }

        interior_colours = updated_colours;
    },
});