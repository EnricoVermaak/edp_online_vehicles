// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Model Conversion", {
	refresh(frm) {},
	model: function (frm) {
		frm.set_value("convert_to_model",null)
		if (frm.doc.model) {
			frm.set_query("vin_serial_no", "table_fgif", function () {
				return {
					filters: {
						model: frm.doc.model,
						availability_status: "Available",
					},
				};
			});

			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Model Administration",
					name: frm.doc.model,
				},
				callback: function (r) {
					if (r.message) {
						var model_data = r.message;

						var model_options = [];
						frm.model_description_data = {};
						frm.model_brand_data = {};

						(model_data.table_fqry || []).forEach(
							function (model_row) {
								model_options.push({
									label: model_row.model,
									value: model_row.model,
								});
								frm.model_description_data[model_row.model] =
									model_row.description;
								frm.model_brand_data[model_row.model] =
									model_row.brand;
							},
						);
						
						//taking the array of labels and filtering 
						const label_list = model_options.map(d => d.label).filter(Boolean);;
						if (frm.doc.model) {
							frm.set_query("convert_to_model", function () {
								return {
									filters: {
										name : ["in", label_list],
										
					},

				}
			})
				};

					}
				},
			});
		}
	},
	convert_to_model: function (frm) {
		var selected_code = "";

		if (frm.doc.convert_to_model && frm.model_description_data) {
			selected_code =
				frm.model_description_data[frm.doc.convert_to_model];
			frm.set_value("convert_to_description", selected_code);
		}

		if (frm.doc.convert_to_model && frm.model_brand_data) {
			selected_code = frm.model_brand_data[frm.doc.convert_to_model];
			frm.set_value("convert_to_brand", selected_code);
		}
	},
	after_save: function (frm) {
		if (frm.doc.status == "Approved") {
			var items = [];

			frm.doc["table_fgif"].forEach(function (row) {
				items.push({
					vin_serial_no: row.vin_serial_no,
				});
			});

			if (items.length > 0) {
				frm.call({
					method: "edp_online_vehicles.events.update_vehicles_details.update_vehicles_details",
					args: {
						items: JSON.stringify(items),
						convert_to_model: frm.doc.convert_to_model,
					},
					callback: function (r) {
						if (r.message) {
							frappe.msgprint(r.message);
						}
					},
				});
			} else {
				frappe.throw("Please add at least one vehicle.");
			}
		}
	},
});
