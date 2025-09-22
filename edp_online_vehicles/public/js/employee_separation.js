frappe.ui.form.on("Employee Separation", {
	employee: function (frm) {
		frm.doc.custom_assets = [];
		frappe.db
			.get_list("Asset", {
				filters: {
					custodian: frm.doc.employee,
				},
				fields: [
					"item_code",
					"asset_category",
					"location",
					"gross_purchase_amount",
				],
			})
			.then((docs) => {
				if (docs.length > 0) {
					for (let row of docs) {
						frm.add_child("custom_assets", {
							item_code: row.item_code,
							asset_category: row.asset_category,
							location: row.location,
							gross_purchase_amount: row.gross_purchase_amount,
						});
						frm.refresh_field("custom_assets");
					}
				} else {
					frm.clear_table("custom_assets");
					frm.refresh_field("custom_assets");
				}
			});
	},
});
