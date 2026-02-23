// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Linked Service Plan", {
    refresh(frm) {
        frm.set_query("service_plan", () => {
            return {
                filters: {
                    status: "Active"
                }
            };
        });
    }
});

