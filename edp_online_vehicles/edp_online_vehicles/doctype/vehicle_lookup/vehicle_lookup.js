frappe.ui.form.on("Vehicle Lookup", {
    vin_serial_no_link(frm) {
        if(frm.doc.vin_serial_no_link){
            frappe.call({
                method: "edp_online_vehicles.events.remaining_vehicles.get_remaining_vehicles",
                args: { vehicle_id: frm.doc.vin_serial_no_link},
                callback: function (r) {
                    frm.set_value("no_of_remaining_vehicles", r.message.length);
                    frm.clear_table("remaining_vehicles");
                    r.message.forEach(function (row) {
                        frm.add_child("remaining_vehicles", { service_schedule: row});
                    });
                    frm.refresh_field("remaining_vehicles");
                }
            });
        }
        frappe.call({
            method: "edp_online_vehicles.events.plans.get_vehicle_details",
            args: { vehicle_id: frm.doc.vin_serial_no_link },
            callback: function (r) {
                frm.clear_table("table_gmug");
                r.message.forEach(function (row) {
                    frm.add_child("table_gmug", { document_no: row.document_no, service_date: row.service_date, service_type: row.service_type, dealer: row.dealer, odo_readinghours: row.odo_readinghours, status: row.status });
                });
                frm.refresh_field("table_gmug");
            }
        });
        frappe.call({
            method: "edp_online_vehicles.events.plans.service_plans",
            args: { vehicle_id: frm.doc.vin_serial_no_link },
            callback: function (r) {
                if (r.message) {

                    frm.clear_table("table_wzas");

                    r.message.forEach(function (row) {
                        frm.add_child("table_wzas", { service_plan_no: row.name, odo_limit: row.service_km_hours_limit, period_months: row.service_period_limit_months, service_plan_description: row.service_plan, status: row.status });

                    });

                    frm.refresh_field("table_wzas");
                }
            }
        });

        frappe.call({
            method: "edp_online_vehicles.events.plans.warranty_plan",
            args: {
                vehicle_id: frm.doc.vin_serial_no_link
            },
            callback: function (r) {
                if (r.message) {
                    frm.clear_table("table_shau");
                    r.message.forEach(function (row) {
                        frm.add_child("table_shau", {
                            warranty_plan_description: row.warranty_plan_description,
                            // period_months: row.period_months,
                            warranty_odo_limit: row.warranty_limit_km_hours,
                            status: row.status,
                            period_months: row.warranty_period_months
                        });
                    });

                    frm.refresh_field("table_shau");
                }
            }
        });


        frappe.call({
            method: "edp_online_vehicles.events.plans.get_history",
            args: { vehicle_id: frm.doc.vin_serial_no_link },
            callback: function (r) {
                frm.clear_table("table_exum");
                r.message.forEach(function (row) {
                    frm.add_child("table_exum", { document_no: row.document_no, odo_readinghours: row.odo_reading, status: row.status, date_of_failure: row.date_of_failure });
                });
                frm.refresh_field("table_exum");
            }
        });




    },
    refresh(frm) {
        // Refresh tables when form is refreshed to show updated status
        if (frm.doc.vin_serial_no_link) {
            frm.trigger("vin_serial_no_link");
        }
        
        frm.add_custom_button(__('Service Booking'), function () {
            frappe.route_options = {
                vin_serial_no: frm.doc.vin_serial_no_link
            };

            // Open new form
            frappe.set_route('Form', 'Vehicle Service Booking', 'new-vehicle-service-booking');

        }, __('Create'));
        frm.add_custom_button(__('Service'), function () {
            frappe.route_options = {
                vin_serial_no: frm.doc.vin_serial_no_link
            };

            // Open new form
            frappe.set_route('Form', 'Vehicles Service', 'new-vehicles-service');

        }, __('Create'));

        frm.add_custom_button(__('Warranty'), function () {
            frappe.route_options = {
                vin_serial_no: frm.doc.vin_serial_no_link
            };

            // Open new form
            frappe.set_route('Form', 'Vehicles Warranty Claims', 'new-vehicles-warranty-claims');

        }, __('Create'));
    }

});
