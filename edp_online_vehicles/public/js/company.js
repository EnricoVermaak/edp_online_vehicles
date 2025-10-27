// frappe.ui.form.on("Vehicles Floorplan", {
//     bank(frm){
//         var row = locals[cdt][cdn];
//         frappe.call({
//             method: "edp_online_vehicles_fawsa.events.get_floorplan_details.get_plan_code",
//             args:{
//                 bank : row.bank
//             },
//             callback: function (r) { 
//                 row.plan is a select field, it should have r.message as its optionsa
//             }
//         });
//     }   
// })

frappe.ui.form.on("Vehicles Floorplan", {
    bank: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.bank) return;

        frappe.call({
            method: "edp_online_vehicles.events.get_floorplan_details.get_plan_code",
            args: {
                bank: row.bank
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "plan", "");
                    let plan_options = r.message.map(plan => plan.name);
                    plan_options.unshift('');

                    frm.fields_dict["custom_floorplan_options"].grid.grid_rows_by_docname[cdn]
                        .get_field("plan")
                        .df.options = plan_options.join('\n');

                    frm.fields_dict["custom_floorplan_options"].grid.refresh();
                }
            }
        });
    }
});

