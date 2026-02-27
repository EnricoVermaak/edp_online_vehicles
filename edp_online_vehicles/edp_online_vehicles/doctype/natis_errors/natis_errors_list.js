// frappe.ui.form.on('Natis Errors', {
//     onload: function(frm) {
//         frappe.call({
//             method: "edp_online_vehicles.natis_errors.api.get_natis_errors",
//             args: { limit: 100 },
//             callback: function(r) {
//                 if(r.message) {
//                     frm.clear_table("errors_table"); // if you have a child table
//                     r.message.forEach(d => {
//                         let row = frm.add_child("errors_table");
//                         row.post_date = d.post_date;
//                         row.post_time = d.post_time;
//                         row.post_type = d.post_type;
//                         row.error_code = d.error_code;
//                         row.error_field = d.error_field;
//                         row.error_descr = d.error_descr;
//                         row.stock_no = d.stock_no;
//                         row.vin_no = d.vin_no;
//                         row.brand_id = d.brand_id;
//                         row.client_name = d.client_name;
//                         row.client_id_type = d.client_id_type;
//                         row.client_id_number = d.client_id_number;
//                         row.dealer_id = d.dealer_id;
//                         row.email_sent_on = d.email_sent_on;
//                     });
//                     frm.refresh();
//                 }
//             }
//         });
//     }
// });