// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on('Vehicles Warranty Towing', {
    refresh(frm) {
        // Backfill model/make from Vehicle Stock for old records where fields were empty
        if (frm.doc.vin_serial_no && (!frm.doc.model || !frm.doc.make || !frm.doc.reg_no)) {
            frappe.db.get_value("Vehicle Stock", frm.doc.vin_serial_no, ["model", "brand", "register_no"])
                .then(r => {
                    if (!r || !r.message) return;
                    let msg = r.message;
                    if (!frm.doc.model && msg.model) frm.set_value("model", msg.model);
                    if (!frm.doc.make && msg.brand) frm.set_value("make", msg.brand);
                    if (!frm.doc.reg_no && msg.register_no) frm.set_value("reg_no", msg.register_no);
                });
        }

        // Clear existing custom buttons to avoid duplicates
        frm.clear_custom_buttons();

        if (!frm.is_new()) {
            
            if (frm.doc.status === "Allocated") {
                frm.add_custom_button("Mark as Received", function () {
                    frm.set_value("status", "Received");
                    frm.save();
                });
            }

            else if (frm.doc.status === "Received") {
                frm.add_custom_button("Mark as Completed", function () {
                    frm.set_value("status", "Completed");
                    frm.save();
                });
            }

            // If status is Completed no button shown
        }

        
    },
    
    before_save: async function (frm) {
        if (frm.doc.hasOwnProperty("reg_no") && frm.doc.reg_no) {
			await frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Vehicle Stock",
					name: frm.doc.vin_serial_no,
					fieldname: "register_no",
					value: frm.doc.reg_no
				}
			});
        }
    }
});