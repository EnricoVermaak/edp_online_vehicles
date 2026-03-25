var VSB_CONFIG = {
    parts: [{
        table: "service_parts_items",
        childtype: "Service Parts Items",
        item_field: "item",
        price_field: "price_excl",
        qty_field: "qty",
        total_field: "total_excl",
        gp_field: "custom_service_gp",
        apply_gp: true,
    }],
    labour: [{
        table: "service_labour_items",
        childtype: "Service Labour Items",
        item_field: "item",
        rate_field: "rate_hour",
        duration_field: "duration_hours",
        total_field: "total_excl",
        gp_field: "custom_service_gp",
        apply_gp: true,
    }],
    totals: {
        parts: "parts_total_excl",
        labour: "labours_total_excl",
        duration: "duration_total",
        qty: "total_items",
    },
    labour_rate_field: "custom_service_labour_rate",
    company_source: "dealer",
};

edp_vehicles.pricing.bind_child_events(VSB_CONFIG);

frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        edp_vehicles.pricing.recalc_totals(frm, VSB_CONFIG);

        if (!frm.is_new()) {
            frappe.db
                .get_value("Vehicle Service Settings", "Vehicle Service Settings", [
                    "allow_user_to_create_part_order_from_vehicle_service_booking",
                ])
                .then((r) => {
                    const allowPartOrder =
                        r.message?.allow_user_to_create_part_order_from_vehicle_service_booking;

                    frm.add_custom_button(
                        __("Vehicles Service"),
                        function () {
                            frappe.call({
                                method: "edp_online_vehicles.events.create_vehicle_service.create_service_from_booking",
                                args: { booking_name: frm.doc.name },
                                freeze: true,
                                freeze_message: __("Creating Service..."),
                                callback(res) {
                                    if (!res.exc && res.message) {
                                        frappe.set_route("Form", "Vehicles Service", res.message);
                                    }
                                },
                            });
                        },
                        __("Create"),
                    );

                    if (allowPartOrder) {
                        frm.add_custom_button(
                            __("Part Order"),
                            function () {
                                if (!frm.doc.service_parts_items || frm.doc.service_parts_items.length === 0) {
                                    frappe.throw(
                                        __(
                                            "No parts added to the parts table, please add parts to perform this action",
                                        ),
                                    );
                                }
                                if (!frm.doc.part_schedule_date) {
                                    frappe.throw(
                                        __("Please select a Scheduled Delivery Date under Parts Table"),
                                    );
                                }
                                frappe.call({
                                    method: "edp_online_vehicles.events.create_part_order.create_part_order_from_booking",
                                    args: { docname: frm.doc.name },
                                    callback(res) {
                                        if (res.message) {
                                            frappe.msgprint(res.message);
                                        }
                                    },
                                });
                            },
                            __("Create"),
                        );
                    }
                });
        }
    },

    onload(frm) {
        frm.set_query("service_type", () => ({
            query: "edp_online_vehicles.events.service_type.service_type_query",
            filters: { model_code: frm.doc.model, vin_serial_no: frm.doc.vin_serial_no }
        }));

        if (frm.fields_dict.service_labour_items) {
            frappe.db.get_value("Vehicle Service Settings", "Vehicle Service Settings", "labour_code_filter")
                .then(r => {
                    let labour_code_filter = r.message?.labour_code_filter || "Service Labour";
                    if (frm.fields_dict.service_labour_items) {
                        frm.set_query("item", "service_labour_items", () => ({
                            filters: { item_group: labour_code_filter }
                        }));
                    }
                });
        }
    },

    async service_type(frm) {
        if (!frm.doc.service_type) {
            frm.clear_table("service_parts_items");
            frm.clear_table("service_labour_items");
            frm.refresh_field("service_parts_items");
            frm.refresh_field("service_labour_items");
            edp_vehicles.pricing.recalc_totals(frm, VSB_CONFIG);
            return;
        }

        let service_type_name = frm.doc.service_type;

        let resp = await fetch(
            "/api/resource/Service Schedules/" + encodeURIComponent(service_type_name),
            { headers: { "X-Frappe-CSRF-Token": frappe.csrf_token } }
        );
        let json = await resp.json();
        let schedule = json.data;
        if (!schedule) return;

        if (frm.doc.service_type !== service_type_name) return;

        frm.doc.service_parts_items = [];
        frm.doc.service_labour_items = [];

        for (let part of schedule.service_parts_items || []) {
            let child = frappe.model.get_new_doc("Service Parts Items", frm.doc, "service_parts_items");
            child.item = part.item;
            child.description = part.description || "";
            child.qty = flt(part.qty || 1);
            child.price_excl = flt(part.price_excl || 0);
            child.total_excl = flt(part.total_excl || 0);
        }

        let company = frm.doc.dealer || frappe.defaults.get_user_default("Company");
        let base_rate = 0;
        if (company) {
            let comp_res = await frappe.db.get_value("Company", company, "custom_service_labour_rate");
            base_rate = flt((comp_res && comp_res.message && comp_res.message.custom_service_labour_rate) || 0);
        }

        for (let labour of schedule.service_labour_items || []) {
            let child = frappe.model.get_new_doc("Service Labour Items", frm.doc, "service_labour_items");
            child.item = labour.item;
            child.description = labour.description || "";
            child.duration_hours = flt(labour.duration_hours || 1);

            let rate = base_rate;
            if (labour.item) {
                try {
                    let gp_res = await frappe.db.get_value("Item", labour.item, "custom_service_gp");
                    let gp_pct = flt((gp_res && gp_res.message && gp_res.message.custom_service_gp) || 0);
                    rate = base_rate + (base_rate * gp_pct / 100);
                } catch (e) { /* use base rate */ }
            }
            child.rate_hour = rate;
            child.total_excl = rate * flt(child.duration_hours || 0);
        }

        let allow_labour = schedule.allow_users_to_add_edit_remove_labour || 0;
        let allow_parts = schedule.allow_users_to_add_edit_remove_parts || 0;
        frm.set_df_property("service_labour_items", "read_only", allow_labour ? 0 : 1);
        frm.set_df_property("service_parts_items", "read_only", allow_parts ? 0 : 1);

        frm.dirty();
        frm.refresh_fields();
        edp_vehicles.pricing.recalc_totals(frm, VSB_CONFIG);

        frm.trigger("odo_reading_hours");
    },

    odo_reading_hours: function (frm) {
        if (!frm.doc.service_type) {
            frappe.model.set_value(frm.doctype, frm.docname, "system_status", null);
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

        if (!frm.doc.vin_serial_no || !frm.doc.odo_reading_hours) return;

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
                    frappe.msgprint(__("Odometer reading cannot be lower than the previous odometer reading"));
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
        if (frm.doc.hasOwnProperty("vehicle_registration_no") && frm.doc.vehicle_registration_no) {
            await frappe.call({
                method: "frappe.client.set_value",
                args: {
                    doctype: "Vehicle Stock",
                    name: frm.doc.vin_serial_no,
                    fieldname: "vehicle_registration_no",
                    value: frm.doc.vehicle_registration_no
                }
            });
        }

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

        let r = await frappe.db.get_value("Company", frm.doc.dealer, "custom_service_labour_rate");
        let new_rate = flt(r?.message?.custom_service_labour_rate || 0);

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

        frm.refresh_field("service_labour_items");
        edp_vehicles.pricing.recalc_totals(frm, VSB_CONFIG);
    },
});

function toggle_summary_fields(frm) {
    let has_parts = (frm.doc.service_parts_items || []).length > 0;
    let has_labour = (frm.doc.service_labour_items || []).length > 0;
    // frm.toggle_display("total_qty", has_parts);
    frm.toggle_display("parts_total_excl", has_parts);
    frm.toggle_display("duration_total", has_labour);
    frm.toggle_display("labours_total_excl", has_labour);
}