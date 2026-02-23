// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let active = null;

frappe.ui.form.on("Vehicles Order Status", {
	refresh(frm) {
		active = frm.doc.active;
		frappe.ui.form.on("Vehicles Order Status", {
    
    auto_move_stock: function(frm) {
        if (frm.doc.auto_move_stock) {
            frm.set_value("in_transit_warehouse", 0);
        }
    },

    in_transit_warehouse: function(frm) {
        if (frm.doc.in_transit_warehouse) {
            frm.set_value("auto_move_stock", 0);
        }
    }

});
	},
	after_save(frm) {
		if (frm.doc.default === 1) {
			frappe.call({
				method: "edp_online_vehicles.events.vehicle_sale_status.change_default",
				args: {
					doc_name: frm.doc.name,
					parent_doctype: "Vehicles Order Status",
				},
				callback: function (r) {},
			});
		}
		if (frm.is_new()) {
			frappe.call({
				method: "edp_online_vehicles.events.change_vehicles_status.add_status_to_settings",
				args: {
					docname: frm.doc.status,
					table_name: "vehicle_order_status_order",
				},
				callback: function (r) {},
			});
		} else if (active !== frm.doc.active) {
			if (frm.doc.active === 1) {
				frappe.call({
					method: "edp_online_vehicles.events.change_vehicles_status.add_status_to_settings",
					args: {
						docname: frm.doc.status,
						table_name: "vehicle_order_status_order",
					},
					callback: function (r) {},
				});
			} else {
				frappe.call({
					method: "edp_online_vehicles.events.change_vehicles_status.remove_status_from_settings",
					args: {
						docname: frm.doc.status,
						table_name: "vehicle_order_status_order",
					},
					callback: function (r) {},
				});
			}
		}
	},
});
