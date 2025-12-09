// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Vehicles Warranty Plan Administration", {
//     vin_serial_no: function (frm) {
//         frappe.msgprint("You have selected VIN/Serial No: ${frm.doc.vin_serial_no}");
//     },
// });
frappe.ui.form.on('Warranty Part Item', {
    part_no: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Vehicle Warranty Plan Item",     // ← child table doctype ka name
                filters: {
                    item: row.part_no                      // ← field name: item OR part_no (your child table field)
                },
                fields: ["name"],
                limit: 1
            },
            callback: function (r) {

                let grid_row = frm.get_field("warranty_part_item").grid.grid_rows_by_docname[cdn].row;

                // If not exist → make row RED
                if (!r.message || r.message.length === 0) {
                    $(grid_row).css("background-color", "#ff6666");
                }
                else {
                    $(grid_row).css("background-color", "");
                }
            }
        });
    }
});

