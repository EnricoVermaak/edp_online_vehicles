frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Open Job", function () {
                frappe.call({
                method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_service_booking.vehicle_service_booking.create_service_from_booking",
                    args: {
                    booking_name: frm.doc.name
                    },
                    callback: function (r) {
                        console.log(r);
                        if (!r.exc && r.message) {
                            // frappe.msgprint("Vehicle Service created successfully.");
                        }
                    }
                });
            });
        }
    },
});

