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
        calculate_item_total(frm, cdt, cdn);
    },

    qty: function (frm, cdt, cdn) {
        calculate_item_total(frm, cdt, cdn);
    }

});

// ----------------------------
// FUNCTION: Calculate price & total
// ----------------------------
function calculate_all_items(frm) {
    frm.doc.service_parts_items.forEach(row => {
        if (!row.item) return;

        frappe.db.get_list('Item Price', {
            filters: { item_code: row.item, price_list: 'Standard Selling' },
            limit: 1,
            fields: ['price_list_rate']
        }).then(prices => {
            let standard_rate = prices.length ? prices[0].price_list_rate : 0;

            frappe.db.get_doc('Item', row.item).then(item_doc => {
                let custom_gp = item_doc.custom_service_gp || 0;

                let price_excl = standard_rate * custom_gp;
                frappe.model.set_value('Service Schedules Parts Items', row.name, 'price_excl', price_excl);

                let total = price_excl * (row.qty || 0);
                frappe.model.set_value('Service Schedules Parts Items', row.name, 'total_excl', total);

                frm.refresh_field("service_parts_items");
            });
        });
    });
}


// frappe.ui.form.on('Service Schedules Labour Items', {

//     item: function (frm, cdt, cdn) {
//         calculate_labour_total(frm, cdt, cdn);
//     },

//     duration_hours: function (frm, cdt, cdn) {
//         calculate_labour_total(frm, cdt, cdn);
//     }

// });

// // ---------------------------------
// // FUNCTION: Calculate Rate & Total
// // ---------------------------------
// function calculate_labour_total(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     if (!row.item) return;

//     frappe.db.get_list('Item Price', {
//         filters: { item_code: row.item, price_list: 'Standard Selling' },
//         limit: 1,
//         fields: ['price_list_rate']
//     }).then(prices => {

//         let standard_rate = prices.length ? prices[0].price_list_rate : 0;

//         frappe.db.get_doc('Item', row.item).then(item_doc => {

//             let custom_gp = item_doc.custom_warranty_gp || 0;

//             // Calculate rate_hour
//             let rate_hour = standard_rate * custom_gp;
//             frappe.model.set_value(cdt, cdn, 'rate_hour', rate_hour);

//             // Calculate total_excl = duration_hours × rate_hour
//             let total = (row.duration_hours || 0) * rate_hour;
// 			console.log(total);
			
//             frappe.model.set_value(cdt, cdn, 'total_excl', total);

//             frm.refresh_field("service_labour_items");
//         });
//     });
// }



frappe.ui.form.on('Service Schedules Labour Items', {

    item: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },

    duration_hours: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    },

    rate_hour: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
    }

});

function calculate_total(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let total = (row.duration_hours || 0) * (row.rate_hour || 0);

    frappe.model.set_value(cdt, cdn, 'total_excl', total);
}