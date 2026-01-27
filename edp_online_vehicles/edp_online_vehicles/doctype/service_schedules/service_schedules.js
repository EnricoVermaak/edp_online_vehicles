// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt
frappe.ui.form.on("Service Schedules", {
    onload(frm) {
        // Query for Parts
        frm.set_query("item", "service_parts_items", () => {
            return {
                filters: {
                    item_group: "Parts"
                , }
            , };
        });
        // Query for Labour
        frm.set_query("item", "service_labour_items", () => {
            return {
                filters: {
                    item_group: "Service Labour"
                , }
            , };
        });
    }
, });

// -------------------- Parts Items --------------------
frappe.ui.form.on('Service Schedules Parts Items', {
    item: function (frm, cdt, cdn) {
        calculate_price(frm, cdt, cdn)
            .then(() => {
                calculate_child_totals(frm);
            });
    }
    , qty: function (frm, cdt, cdn) {
        calculate_price(frm, cdt, cdn)
            .then(() => {
                calculate_child_totals(frm);
            });
    }
});

// Function to calculate price for parts
function calculate_price(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (!row.item) return Promise.resolve();
    
    // --- Use get_value instead of get_list ---
    return frappe.db.get_value('Item Price'
            , {
                item_code: row.item
                , price_list: 'Standard Selling'
            }
            , 'price_list_rate'
        )
        .then(price_doc => {
            
            let standard_rate = price_doc.message ? price_doc.message.price_list_rate : 0;
            
            return frappe.db.get_doc('Item', row.item)
                .then(item_doc => {
                    let custom_gp = item_doc.custom_service_gp || 0;
                    let gp_percentage = custom_gp / 100;
                    
                    let price = standard_rate + (standard_rate * gp_percentage);
                    let total = price * (row.qty || 0);
                    
                    frappe.model.set_value(cdt, cdn, 'price_excl', price);
                    frappe.model.set_value(cdt, cdn, 'total_excl', total);
                    
                    frm.refresh_field('service_parts_items');
                });
        });
}

// -------------------- Labour Items --------------------
frappe.ui.form.on('Service Schedules Labour Items', {
    rate_hour: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
        calculate_child_totals(frm);
    }
    , duration_hours: function (frm, cdt, cdn) {
        calculate_total(frm, cdt, cdn);
        calculate_child_totals(frm);
    }
});

// Function to calculate total for labour
function calculate_total(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    let total = (row.rate_hour || 0) * (row.duration_hours || 0);
    frappe.model.set_value(cdt, cdn, "total_excl", total);
    
    frm.refresh_field("service_labour_items");
}

// -------------------- Child Totals --------------------
function calculate_child_totals(frm) {
    let parts_total = 0;
    let labour_total = 0;
    
    // Sum of all service_parts_items
    frm.doc.service_parts_items.forEach(row => {
        parts_total += row.total_excl || 0;
    });
    
    // Sum of all service_labour_items
    frm.doc.service_labour_items.forEach(row => {
        labour_total += row.total_excl || 0;
    });
    
    // Set values in custom fields only
    frm.set_value('custom_parts_total_excl', parts_total);
    frm.set_value('custom_labours_total_excl', labour_total);
    
    frm.refresh_field('custom_parts_total_excl');
    frm.refresh_field('custom_labours_total_excl');
}


// frappe.ui.form.on('Service Schedules Labour Items', {
// 	item: function (frm, cdt, cdn) {
// 		let row = locals[cdt][cdn];
// 		if (!row.item) return;


// 		frappe.db.get_list('Item Price', {
// 			filters: { item_code: row.item, price_list: 'Standard Selling' },
// 			limit: 1,
// 			fields: ['price_list_rate']
// 		}).then(prices => {
// 			let standard_rate = prices.length ? prices[0].price_list_rate : 0;

// 			frappe.db.get_doc('Item', row.item).then(item_doc => {
// 				let custom_gp = item_doc.custom_warranty_gp || 0;
// 				let price = standard_rate * custom_gp;

// 				frappe.model.set_value(cdt, cdn, 'rate_hour', price);
// 				frm.refresh_field('service_labour_items'); 
// 			});
// 		});
// 	}
// });
