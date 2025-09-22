// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Catalogue", {
	refresh(frm) {
		var selected_items = [];

		// Inject custom CSS if not already injected
		if (!$("head style#custom-image-style").length) {
			$("<style id='custom-image-style'>")
				.html(
					"div.frappe-control[data-fieldname='image'] img { max-width: 700px !important; max-height: 700px !important; }",
				)
				.appendTo("head");
		}

		for (let row of frm.doc.parts) {
			frappe.db
				.get_value("Bin", { item_code: row.part }, "actual_qty")
				.then((soh) => {
					if (row.soh != soh.message.actual_qty) {
						console.log("SOH update");
						frappe.model.set_value(
							row.doctype,
							row.name,
							"soh",
							soh.message.actual_qty,
						);
					}
				});

			frappe.db
				.get_value(
					"Item Price",
					{ item_code: row.part },
					"price_list_rate",
				)
				.then((dealer_billing) => {
					let price = dealer_billing.message.price_list_rate;

					if (row.price != price) {
						console.log(price);
						console.log(row.price);
						frappe.model.set_value(
							row.doctype,
							row.name,
							"price",
							price,
						);
					}
				});
		}

		if (frm.is_dirty()) {
			frm.save();
		}

		if (!frm.is_new()) {
			frm.fields_dict["parts"].grid.add_custom_button("Order", () => {
				frm.doc["parts"].forEach(function (row) {
					if (row.__checked) {
						if (row.qty < 1) {
							frappe.throw(
								"Please ensure the selected part's Qty is greater than 0",
							);
						}

						selected_items.push(row);
					}
				});

				frappe.route_options = {
					parts: selected_items,
				};

				frappe.set_route("app/part-order-1");
			});
		}
	},

	catalogue_index(frm) {
		if (frm.doc.catalogue_index) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Catalogue Index",
					name: frm.doc.catalogue_index,
				},
				callback: function (r) {
					if (r.message) {
						var index_data = r.message;

						var sub_index_options = [];

						(index_data.table_jirl || []).forEach(
							function (index_row) {
								sub_index_options.push({
									label: index_row.subindex,
									value: index_row.subindex,
								});
							},
						);

						var field = frm.fields_dict.sub_index;
						field.df.options = sub_index_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}
	},
});
