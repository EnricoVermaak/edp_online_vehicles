// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Natis Errors", {
//     refresh: function(frm) {
//         frm.add_custom_button("Import Natis Errors", function() {
//             frappe.call({
//                 method: "edp_online_vehicles_mahindra.events.natis_table_sync.populate_natis_errors",
//                 callback: function(r) {
//                     if (r.message) {
//                         frappe.msgprint(r.message);
//                         frm.reload_doc(); // refresh the form/list
//                     }
//                 }
//             });
//         });
//     }
// });