// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Linked Warranty Plan", {
    refresh(frm) {
        frm.set_query("warranty_plan", function () {
            return {
                filters: {
                    status: "Active"
                }
            };
        });
    }
});
