// Copyright (c) 2026, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on('Item Details', {
    create_item_button(frm) {
        frappe.call({
            method: "create_item",
            doc: frm.doc,
            freeze: true,
            freeze_message: "Creating Item...",
            callback: function(r) {
                frappe.msgprint("Item created");
            }
        });
    },
    onload(frm) {
        frm.disable_save();
        frm.page.clear_menu();
        frm.set_value({
            item_code: "",
            item_description: "",
            item_group: "",
            bin_location: "",
            uom: "",
            service_gp: "",
            warranty_gp: ""
        });

        frm.clear_table("table_item_price_lists");
        frm.refresh_field("table_item_price_lists");
    }
});

