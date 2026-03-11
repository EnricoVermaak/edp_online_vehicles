frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        toggle_summary_fields(frm);
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
                            if (!frm.doc.service_parts_items || frm.doc.service_parts_items.length === 0) {
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

        // Set filters on item queries
		frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
			.then(r => {
				let labour_code_filter = r.message?.labour_code_filter || "Service Labour";

				frm.set_query("item", "service_labour_items", () => {
					return {
						filters: {
							item_group: labour_code_filter
						}
					};
				});
			});

		frm.set_query("item", "service_parts_items", () => {
			return {
				filters: {
					item_group: "Parts",
				},
			};
		});

        toggle_summary_fields(frm);
		calculate_parts_total_combined(frm);
		calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
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
                frm.clear_table("service_parts_items");
                frm.clear_table("service_labour_items");
                
                // Parts
                (doc.service_parts_items || [])
                .forEach(row => {
                    let child = frm.add_child("service_parts_items");
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
                
                // Labour - apply GP% per item
                for (const row of doc.service_labour_items || []) {
                    let child = frm.add_child("service_labour_items");
                    child.item = row.item;
                    child.description = row.description;
                    child.duration_hours = row.duration_hours || 1;
                    let rate = company_rate;
                    if (row.item) {
                        let item_doc = await frappe.db.get_doc("Item", row.item);
                        let gp_pct = item_doc.custom_service_gp || 0;
                        rate = company_rate + (company_rate * (gp_pct / 100));
                    }
                    child.rate_hour = rate;
                    child.total_excl = rate * child.duration_hours;
                }
                
                // Refresh tables and recalculate totals
                frm.refresh_field("service_parts_items");
                calculate_parts_total_combined(frm);
                frm.refresh_field("service_labour_items");
                calculate_labours_total_combined(frm);
                calculate_duration_total_combined(frm);
                try { frm.refresh_field("labours_total_excl"); frm.refresh_field("duration_total"); } catch (e) {}
            }
        });
    }, 
    
    odo_reading_hours: function (frm, dt, dn) {

        if (!frm.doc.service_type) {
			frappe.model.set_value(dt, dn, "system_status", null);
			frappe.msgprint("Please select a Service Type and VIN/Serial No before setting the Odo Reading");
			frm.doc.odo_reading_hours = null;
			frm.refresh_field("odo_reading_hours");
			return;
		}

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

        if (!frm.doc.vin_serial_no || !frm.doc.odo_reading_hours) {
            return;
        }

        // OdoS input cannot be lower than stock
        frappe.call({
            method: "edp_online_vehicles.events.odo.validate_odo_reading",
            args: {
                vin_serial_no: frm.doc.vin_serial_no,
                odo_reading_hours: frm.doc.odo_reading_hours,
                doctype: frm.doctype,
                docname: frm.doc.name,
            },
            callback: function (r) {

                if (r.message.status === "failed") {

                    frappe.msgprint(
                        __("Odometer reading cannot be lower than the previous odometer reading")
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

        if (frm.doc.hasOwnProperty("vehicle_registration_number") && frm.doc.vehicle_registration_number) {
			await frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Vehicle Stock",
					name: frm.doc.vin_serial_no,
					fieldname: "register_no",
					value: frm.doc.vehicle_registration_number
				}
			});
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


        await frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Vehicle Stock",
                name: frm.doc.vin_serial_no,
                fieldname: "odo_reading",
                value: frm.doc.odo_reading_hours
            }
        });

    },

    dealer: async function (frm) {

        if (!frm.doc.dealer) return;

        let r = await frappe.db.get_value(
            "Company",
            frm.doc.dealer,
            "custom_service_labour_rate"
        );

        let new_rate = flt(r?.message?.custom_service_labour_rate || 0);

        // IMPORTANT: Booking labour table is service_labour_items - apply GP% per item
        for (const row of frm.doc.service_labour_items || []) {
            let rate = new_rate;
            if (row.item) {
                let item_doc = await frappe.db.get_doc("Item", row.item);
                let gp_pct = item_doc.custom_service_gp || 0;
                rate = new_rate + (new_rate * (gp_pct / 100));
            }
            row.rate_hour = rate;
            row.total_excl = rate * (row.duration_hours || 0);
        }

        calculate_labours_total_combined(frm);
		calculate_duration_total_combined(frm);
        frm.refresh_field("service_labour_items");
    },
});

frappe.ui.form.on("Service Labour Items", {
    item(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item || !frm.doc.dealer) return;
        frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate")
            .then(r => {
                let base_rate = flt(r?.message?.custom_service_labour_rate || 0);
                return frappe.db.get_doc("Item", row.item).then(item_doc => {
                    let gp_pct = item_doc.custom_service_gp || 0;
                    let rate = base_rate + (base_rate * (gp_pct / 100));
                    frappe.model.set_value(cdt, cdn, "rate_hour", rate);
                    frappe.model.set_value(cdt, cdn, "total_excl", rate * flt(row.duration_hours || 0));
                });
            })
            .then(() => {
                calculate_labours_total_combined(frm);
                calculate_duration_total_combined(frm);
                frm.refresh_field("service_labour_items");
            });
    },

    service_labour_items_remove(frm) {
        calculate_labours_total_combined(frm);
        calculate_duration_total_combined(frm);
    },

    total_excl(frm) {
        calculate_labours_total_combined(frm);
    },

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

});

// -------------------- Parts Items --------------------
frappe.ui.form.on("Service Parts Items", {
    item(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item) return;
        frappe.db.get_value("Item Price",
            { item_code: row.item, price_list: "Standard Selling" },
            "price_list_rate"
        ).then(price_doc => {
            let standard_rate = price_doc.message ? price_doc.message.price_list_rate : 0;
            return frappe.db.get_doc("Item", row.item).then(item_doc => {
                let gp_pct = item_doc.custom_service_gp || 0;
                let price = standard_rate + (standard_rate * (gp_pct / 100));
                let total = price * (row.qty || 0);
                frappe.model.set_value(cdt, cdn, "price_excl", price);
                frappe.model.set_value(cdt, cdn, "total_excl", total);
                frm.refresh_field("service_parts_items");
                calculate_parts_total_combined(frm);
            });
        });
    },

    qty(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let total = (row.price_excl || 0) * (row.qty || 0);
        frappe.model.set_value(cdt, cdn, "total_excl", total);
        frm.refresh_field("service_parts_items");
        calculate_parts_total_combined(frm);
    },

    service_parts_items_remove(frm) {
        calculate_parts_total_combined(frm);
    },
});

// LABOUR TOTAL
const calculate_labour_total = (frm, cdt, cdn) => {
	let row = locals[cdt][cdn];
	let total = (row.rate_hour || 0) * (row.duration_hours || 0);
	frappe.model.set_value(cdt, cdn, "total_excl", total);
};

// Parts total = OEM parts total_excl + Non OEM parts total_excl (one combined total)
// Booking uses `service_parts_items` for parts rows
const calculate_parts_total_combined = (frm) => {
    let oem = 0;
    for (const row of frm.doc.service_parts_items || []) {
        oem += row.total_excl || 0;
    }
    let non_oem = 0;
    for (const row of frm.doc.non_oem_parts_items || []) {
        non_oem += row.total_excl || 0;
    }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "parts_total_excl", oem + non_oem);
    let total_qty = 0;
    for (const row of frm.doc.service_parts_items || []) { total_qty += flt(row.qty || 0); }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "total_items", total_qty);
    try { frm.refresh_field("parts_total_excl"); } catch (e) {}
    toggle_summary_fields(frm);
};

// Labour total = OEM labour total_excl + Non OEM labour total_excl; duration_total = sum of both tables' duration_hours
const calculate_labours_total_combined = (frm) => {
    // Booking labour table is `service_labour_items`
    let total = 0;
    for (const row of frm.doc.service_labour_items || []) {
        total += row.total_excl || 0;
    }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "labours_total_excl", total);
    try { frm.refresh_field("labours_total_excl"); } catch (e) {}
    toggle_summary_fields(frm);
};

const calculate_duration_total_combined = (frm) => {
    let hours = 0;
    for (const row of frm.doc.service_labour_items || []) {
        hours += row.duration_hours || 0;
    }
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "duration_total", hours);
    try { frm.refresh_field("duration_total"); } catch (e) {}
};

function toggle_summary_fields(frm) {
    let has_parts = (frm.doc.service_parts_items || []).length > 0;
    let has_labour = (frm.doc.service_labour_items || []).length > 0;
    frm.toggle_display("total_items", has_parts);
    frm.toggle_display("parts_total_excl", has_parts);
    frm.toggle_display("duration_total", has_labour);
    frm.toggle_display("labours_total_excl", has_labour);
}