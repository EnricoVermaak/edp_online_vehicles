frappe.ui.form.on("Vehicle Service Booking", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Open Job", function () {
              
                frappe.call({
                    method: "edp_online_vehicles.events.api.create_service_from_booking",
                    args: {
                        booking_name: frm.doc.name
                    },
                    callback: function (r) {
                        console.log(r);
                        if (!r.exc && r.message) {
                        }
                    }
                });
            });
        }
    }, 
    onload(frm) {
	frm.set_query("service_type", () => {
			return {
				query: "edp_online_vehicles.events.service_type.service_type_query",
				filters: {
					model_code: frm.doc.model,
					vin_serial_no: frm.doc.vin_serial_no,  // correct key
				},
			};
		});
    },
  service_type(frm) {
    if (!frm.doc.service_type) return;

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Service Schedules",
            name: frm.doc.service_type
        },
        callback: function (r) {
            if (!r.message) return;

            let doc = r.message;

            // clear old rows
            frm.clear_table("table_jwkk");
            frm.clear_table("table_ottr");

            // Parts
            (doc.service_parts_items || []).forEach(row => {
                let child = frm.add_child("table_jwkk");
                child.item = row.item;
                child.description = row.description;
                child.qty = row.qty;
                child.price_excl = row.price_excl;
                child.total_excl = row.total_excl;
            });

            // Labour
            (doc.service_labour_items || []).forEach(row => {
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

});

