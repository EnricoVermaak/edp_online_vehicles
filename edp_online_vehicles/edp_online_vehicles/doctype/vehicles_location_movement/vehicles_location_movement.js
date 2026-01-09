// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Location Movement", {
    refresh(frm) {
        // Limit prev_warehouse choices to the warehouse linked to the VIN (Serial No)
        frm.set_query('prev_warehouse', () => ({
            query: 'edp_online_vehicles.events.custom_queries.warehouse_linked_to_vin',
            filters: {
                // your field on the form is "vinserial_no" (no underscore)
                vin_serial_no: frm.doc.vinserial_no || ''
            }
        }));

        // Auto-fill prev_warehouse if we can resolve it from the Serial No
        if (frm.doc.vinserial_no && !frm.doc.prev_warehouse) {
            frappe.call({
                method: 'edp_online_vehicles.events.get_warehouse_for_vin.get_warehouse_for_vin',
                args: { vin_serial_no: frm.doc.vinserial_no },
                callback: (r) => {
                    if (r.message) {
                        frm.set_value('prev_warehouse', r.message)
                        .then(() => {
                            frm.save();
                        });
                    }
                }
            });
        }
    },

    // Keep it in sync if the VIN changes
    vinserial_no(frm) {
        frm.set_value('prev_warehouse', null);
        if (frm.doc.vinserial_no) {
            frappe.call({
                method: 'edp_online_vehicles.events.get_warehouse_for_vin.get_warehouse_for_vin',
                args: { vin_serial_no: frm.doc.vinserial_no },
                callback: (r) => {
                    if (r.message) {
                        frm.set_value('prev_warehouse', r.message)
                        .then(() => {
                            frm.save();
                        });
                    }
                }
            });
        }
    }
});
