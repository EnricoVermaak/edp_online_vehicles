// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Natis Errors", {
//     onload: function(frm) {
//         // Only run if document is new or not yet populated
//         if (frm.is_new() && !frm.doc.natis_errors_loaded) {
//             frappe.call({
//                 method: "edp_online_vehicles_mahindrasa.events.natis_table_sync.populate_natis_errors",
//                 callback: function(r) {
//                     if (r.message) {
//                         frappe.msgprint(r.message);

//                         // Mark as loaded so it doesn't run again
//                         frm.set_value("natis_errors_loaded", true); // false for test DELETE later
//                         frm.save();
//                     }
//                 }
//             });
//         }
//         frappe.listview_settings["Natis Errors"] = {
//         onload: function(listview) {
//             listview.page.clear_primary_action();
//         }
//         };
//     }
// });