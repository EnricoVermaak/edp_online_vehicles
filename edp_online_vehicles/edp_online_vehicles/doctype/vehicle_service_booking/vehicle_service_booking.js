frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Open Job", function () {
                frappe.call({
                    method: "edp_online_vehicles.events.create_vehicle_service.create_service_from_booking",
                    args: { booking_name: frm.doc.name },
                    freeze: true,
                    freeze_message: "Creating Service...",
                    callback: function(r) {
                        if (!r.exc && r.message) {
                            frappe.set_route("Form", "Vehicles Service", r.message);
                        }
                    }
                });
            });

            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Vehicle Service Settings" },
                callback: function (r) {
                    if (r.message && r.message.allow_user_to_create_part_order_from_vehicle_service_booking) {
                        frm.add_custom_button(__("Part Order"), function () {
                            if (!frm.doc.table_jwkk || frm.doc.table_jwkk.length === 0) {
                                frappe.throw(__("No parts added to the parts table, please add parts to perform this action"));
                            }
                            if (!frm.doc.part_schedule_date) {
                                frappe.throw(__("Please select a Scheduled Delivery Date under Parts Table"));
                            }
                            frappe.call({
                                method: "edp_online_vehicles.events.create_part_order.create_part_order_from_booking",
                                args: { docname: frm.doc.name },
                                callback: function (r) {
                                    if (r.message) {
                                        frappe.msgprint(r.message);
                                    }
                                }
                            });
                        }, __("Create"));
                    }
                }
            });
        }
    },
    
    onload(frm) {
        frm.set_query("service_type", () => ({
            query: "edp_online_vehicles.events.service_type.service_type_query",
            filters: { model_code: frm.doc.model, vin_serial_no: frm.doc.vin_serial_no }
        }));
    },

    service_type(frm) {
        frm.trigger("odo_reading_hours"); // Run validation when service type changes
        
        if (!frm.doc.service_type) return;
        
        frappe.call({
            method: "frappe.client.get"
            , args: {
                doctype: "Service Schedules"
                , name: frm.doc.service_type
            }
            , callback: async function (r) {
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

                // Get company rate for labour
                let company_rate = 0;

                if (frm.doc.dealer) {
                    let company_data = await frappe.db.get_value(
                        "Company",
                        frm.doc.dealer,
                        "custom_service_labour_rate"
                    );
                    company_rate = flt(company_data?.message?.custom_service_labour_rate || 0);
                }
                
                // Labour
                (doc.service_labour_items || []).forEach(row => {
                    let child = frm.add_child("table_ottr");
                    child.item = row.item;
                    child.description = row.description;
                    child.duration_hours = row.duration_hours || 1;
                    child.rate_hour = company_rate;
                    child.total_excl = company_rate * child.duration_hours;
                });
                
                // Refresh the labour table UI and recalculate totals
                frm.refresh_field("table_ottr");
                calculate_labours_total_combined(frm);
                calculate_duration_total_combined(frm);
                try { frm.refresh_field("labours_total_excl"); frm.refresh_field("duration_total"); } catch (e) {}
            }
        });
    }, 
    
    odo_reading_hours: function (frm, dt, dn) {
        if (frm.doc.odo_reading_hours > 0 && frm.doc.service_type && frm.doc.model) {
            frappe.db.get_value("Service Schedules", frm.doc.service_type, "interval")
                .then(r => {
                    if (!r || !r.message) return;
                    let interval = parseInt(r.message.interval || 0, 10);
                    return frappe.db.get_value("Model Administration", frm.doc.model, [
                        "service_type_max_allowance",
                        "service_type_minimum_allowance"
                    ]).then(r2 => {
                        let msg = (r2 && r2.message) ? r2.message : r2;
                        if (!msg) return null;
                        return { interval, msg };
                    });
                })
                .then(data => {
                    if (!data) return;
                    let max_allowance = parseInt(data.msg.service_type_max_allowance || 0, 10);
                    let min_allowance = parseInt(data.msg.service_type_minimum_allowance || 0, 10);
                    let min_odo_value = data.interval - min_allowance;
                    let max_odo_value = data.interval + max_allowance;
                    let in_range = frm.doc.odo_reading_hours >= min_odo_value && frm.doc.odo_reading_hours <= max_odo_value;
                    frappe.model.set_value(frm.doctype, frm.docname, "system_status", in_range ? "Conditionally Approved" : "Conditionally Declined");
                    frm.refresh_field("system_status");
                });
        } else {
            frappe.model.set_value(frm.doctype, frm.docname, "system_status", null);
            frm.refresh_field("system_status");
        }

        // OdoS input cannot be lower than stock
        frappe.call({
            method: "edp_online_vehicles.events.odo.validate_odo_reading",
            args: {
                vin_serial_no: frm.doc.vin_serial_no,
                odo_reading_hours: frm.doc.odo_reading_hours
            },
            callback: function (r) {

                if (r.message.status === "failed") {

                    frappe.msgprint(
                        __("Odometer cannot be lower than stock {0}km", [r.message.stock_odo])
                    );

                    frm.set_value("odo_reading_hours", null);
                    frm.refresh_field("odo_reading_hours");
                }
            }
        });
    },

    validate: function (frm) {
        frm.trigger("odo_reading_hours");
    },


    before_save: async function(frm) {
    //Save the service odometer reading back to the linked Vehicle Stock record (Not implemented will do later as hook?)
        if (!frm.doc.vin_serial_no || !frm.doc.odo_reading_hours) {
            return;
        }

        let r = await frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Vehicle Stock",
                filters: { name: frm.doc.vin_serial_no },
                fieldname: "odo_reading"
            }
        });

        let stock_odo = r.message.odo_reading || 0;

        if (parseFloat(frm.doc.odo_reading_hours) > parseFloat(stock_odo)) {
            await frappe.call({
                method: "frappe.client.set_value",
                args: {
                    doctype: "Vehicle Stock",
                    name: frm.doc.vin_serial_no,
                    fieldname: "odo_reading",
                    value: frm.doc.odo_reading_hours
                }
            });
        }
    },

    dealer: async function (frm) {

        if (!frm.doc.dealer) return;

        let r = await frappe.db.get_value(
            "Company",
            frm.doc.dealer,
            "custom_service_labour_rate"
        );

        let new_rate = flt(r?.message?.custom_service_labour_rate || 0);

        // IMPORTANT: Booking labour table is table_ottr
        (frm.doc.table_ottr || []).forEach(row => {
            row.rate_hour = new_rate;
            row.total_excl = new_rate * (row.duration_hours || 0);
        });

        calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
		frm.refresh_field("service_labour_items");

        frm.refresh_field("table_ottr");
    },
});

frappe.ui.form.on("Service Labour Items", {
    duration_hours(frm, cdt, cdn) {
        calculate_labour_total(frm, cdt, cdn);
        calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
    },
    
    rate_hour(frm, cdt, cdn) {
        calculate_labour_total(frm, cdt, cdn);
        calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
    },

    duration_hours_change(frm, cdt, cdn) {
        calculate_labour_total(frm, cdt, cdn);
        calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
    },

    rate_hour_change(frm, cdt, cdn) {
        calculate_labour_total(frm, cdt, cdn);
        calculate_labours_total_combined(frm);
        calculate_duration_total_combined(frm);
    },
});

// PARTS TOTAL
const calculate_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.price_excl || 0) * (row.qty || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// LABOUR TOTAL
const calculate_labour_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.rate_hour || 0) * (row.duration_hours || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// EXTRA TOTAL
const calculate_extra_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.price_per_item_excl || 0) * (row.qty || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// SUB TOTAL
const calculate_sub_total = (frm, field_name, table_name) => {
	let sub_total = 0;

	for (const row of frm.doc[table_name] || []) {
		sub_total += row.total_excl || 0;
	}

	frappe.model.set_value(frm.doc.doctype, frm.doc.name, field_name, sub_total);
	// refresh_summary_totals(frm);
};

// Parts total = OEM parts total_excl + Non OEM parts total_excl (one combined total)
// Booking uses `table_jwkk` for parts rows
const calculate_parts_total_combined = (frm) => {
    let oem = 0;
    for (const row of frm.doc.table_jwkk || []) {
        oem += row.total_excl || 0;
    }
    let non_oem = 0;
    for (const row of frm.doc.non_oem_parts_items || []) {
        non_oem += row.total_excl || 0;
    }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "parts_total_excl", oem + non_oem);
    try { frm.refresh_field("parts_total_excl"); } catch (e) {}
    // refresh_summary_totals(frm);
};

// LABOUR HOURS (single table)
const calculate_labour_hours = (frm, field_name, table_name) => {
	let hours_total = 0;

	for (const row of frm.doc[table_name] || []) {
		hours_total += row.duration_hours || 0;
	}

	frappe.model.set_value(frm.doc.doctype, frm.doc.name, field_name, hours_total);
};

// Labour total = OEM labour total_excl + Non OEM labour total_excl; duration_total = sum of both tables' duration_hours
const calculate_labours_total_combined = (frm) => {
    // Booking labour table is `table_ottr`
    let total = 0;
    for (const row of frm.doc.table_ottr || []) {
        total += row.total_excl || 0;
    }
    console.log("Total after booking labour items: " + total);
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "labours_total_excl", total);
    try { frm.refresh_field("labours_total_excl"); } catch (e) {}
    // refresh_summary_totals(frm);
};

const calculate_duration_total_combined = (frm) => {
    let hours = 0;
    for (const row of frm.doc.table_ottr || []) {
        hours += row.duration_hours || 0;
    }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "duration_total", hours);
    try { frm.refresh_field("duration_total"); } catch (e) {}
};
