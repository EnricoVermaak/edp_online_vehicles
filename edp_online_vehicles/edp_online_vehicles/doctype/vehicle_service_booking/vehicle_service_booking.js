frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Open Job", function () {
                
                frappe.call({
                    method: "edp_online_vehicles.events.create_vehicle_service.create_service_from_booking"
                    , args: {
                        booking_name: frm.doc.name
                    }
                    , callback: function (r) {
                        console.log(r);
                        if (!r.exc && r.message) {}
                    }
                });
            });
        }
    }
    , onload(frm) {
        frm.set_query("service_type", () => {
            return {
                query: "edp_online_vehicles.events.service_type.service_type_query"
                , filters: {
                    model_code: frm.doc.model
                    , vin_serial_no: frm.doc.vin_serial_no, // correct key
                }
            , };
        });
    }
    , service_type(frm) {
        frm.trigger("odo_reading_hours"); // Run validation when service type changes
        
        if (!frm.doc.service_type) return;
        
        frappe.call({
            method: "frappe.client.get"
            , args: {
                doctype: "Service Schedules"
                , name: frm.doc.service_type
            }
            , callback: function (r) {
                if (!r.message) return;
                
                let doc = r.message;
                
                // clear old rows
                frm.clear_table("table_jwkk");
                frm.clear_table("table_ottr");
                
                // Parts
                (doc.service_parts_items || [])
                .forEach(row => {
                    let child = frm.add_child("table_jwkk");
                    child.item = row.item;
                    child.description = row.description;
                    child.qty = row.qty;
                    child.price_excl = row.price_excl;
                    child.total_excl = row.total_excl;
                });
                
                // Labour
                (doc.service_labour_items || [])
                .forEach(row => {
                    let child = frm.add_child("table_ottr");
                    child.item = row.item;
                    child.description = row.description;
                    child.duration_hours = row.duration_hours;
                    child.rate_hour = row.rate_hour;
                    child.total_excl = row.total_excl;
                });
                
                frm.refresh_field("table_jwkk");
                frm.refresh_field("table_ottr");
            }
        });
    }
    , odo_reading_hours: function (frm, dt, dn) {
        if (frm.doc.odo_reading_hours > 0 && frm.doc.service_type && frm.doc.model) {
            
            frappe.db.get_value("Service Schedules", frm.doc.service_type, "interval")
                .then(r => {
                    if (!r.message) return;
                    let interval = parseInt(r.message.interval || 0);
                    
                    frappe.db.get_value("Model Administration", frm.doc.model, [
                        "service_type_max_allowance"
                        , "service_type_minimum_allowance"
                    ])
                        .then(r => {
                            if (!r.message) return;
                            let max_allowance = parseInt(r.message.service_type_max_allowance || 0);
                            let min_allowance = parseInt(r.message.service_type_minimum_allowance || 0);
                            
                            let min_odo_value = interval - min_allowance;
                            let max_odo_value = interval + max_allowance;
                            
                            if (frm.doc.odo_reading_hours >= min_odo_value && frm.doc.odo_reading_hours <= max_odo_value) {
                                frappe.model.set_value(frm.doctype, frm.docname, "status", "Conditionally Approved");
                            } else {
                                frappe.model.set_value(frm.doctype, frm.docname, "status", "Conditionally Declined");
                            }
                            
                            frm.refresh_field("status");
                        });
                });
        }
    },
    validate: function (frm) {
        frm.trigger("odo_reading_hours");
    }
    
});
