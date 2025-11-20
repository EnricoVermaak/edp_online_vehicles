// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Service Schedules", {
	onload(frm) {
		frm.set_query("item", "service_parts_items", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});
		frm.set_query("item", "service_labour_items", () => {
			return {
				filters: {
					item_group: "Service Labour",
				},
			};
		});
	},
});

frappe.ui.form.on('Service Schedules Parts Items', {

    item: function (frm, cdt, cdn) {
        calculate_price(frm, cdt, cdn);
    },

    qty: function (frm, cdt, cdn) {
        calculate_price(frm, cdt, cdn);
    }

});

function calculate_price(frm, cdt, cdn) {

    let row = locals[cdt][cdn];
    if (!row.item) return;

    // --- 1) Get Standard Selling Price ---
    frappe.db.get_list('Item Price', {
        filters: { 
            item_code: row.item,
            price_list: 'Standard Selling'
        },
        limit: 1,
        fields: ['price_list_rate']
    }).then(prices => {

        let standard_rate = prices.length ? prices[0].price_list_rate : 0;

        // --- 2) Get Item Doc to read custom GP ---
        frappe.db.get_doc('Item', row.item).then(item_doc => {

            let custom_gp = item_doc.custom_service_gp || 0;

            // --- 3) Price & Total Calculation ---
            let price = standard_rate * custom_gp;
            let total = price * (row.qty || 0);

            // --- 4) Set Values in Child Row ---
            frappe.model.set_value(cdt, cdn, 'price_excl', price);
            frappe.model.set_value(cdt, cdn, 'total_excl', total);

            frm.refresh_field('service_parts_items');

        });
    });
}

frappe.ui.form.on('Service Schedules Labour Items', {
	item: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (!row.item) return;
		

		frappe.db.get_list('Item Price', {
			filters: { item_code: row.item, price_list: 'Standard Selling' },
			limit: 1,
			fields: ['price_list_rate']
		}).then(prices => {
			let standard_rate = prices.length ? prices[0].price_list_rate : 0;

			frappe.db.get_doc('Item', row.item).then(item_doc => {
				let custom_gp = item_doc.custom_warranty_gp || 0;
				let price = standard_rate * custom_gp;

				frappe.model.set_value(cdt, cdn, 'rate_hour', price);
				frm.refresh_field('service_labour_items'); 
			});
		});
	}
});



