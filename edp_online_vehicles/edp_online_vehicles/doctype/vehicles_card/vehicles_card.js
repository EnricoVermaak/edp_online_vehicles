// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Card", {
	model(frm, dt, dn) {
		if (frm.doc.model) {
			frm.doc.specifications = [];
			frappe.db
				.get_doc("Model Administration", frm.doc.model)
				.then((doc) => {
					for (let row of doc.additional_specifications) {
						frm.add_child("specifications", {
							specification: row.specification,
							value: row.value,
						});
						frm.refresh_field("specifications");
					}
				});
		} else {
			frm.doc.specifications = [];
			frm.refresh_field("specifications");
		}
	},
	onload(frm, dt, dn) {
		if (!frm.is_new()) {
			if (frm.doc.vin_serial_no) {
				frappe.call({
					method: "edp_online_vehicles.events.get_contract_details.get_latest_contract_details",
					args: {
						vinno: frm.doc.vin_serial_no,
					},
					callback: function (r) {
						const parentContracts = r.message;

						if (parentContracts.length > 0) {
							frappe.model.set_value(
								dt,
								dn,
								"contract_no",
								parentContracts[0].name,
							);
							frappe.model.set_value(
								dt,
								dn,
								"contract_status",
								parentContracts[0].custom_contract_status,
							);
							frappe.model.set_value(
								dt,
								dn,
								"contract_start_date",
								parentContracts[0].start_date,
							);
							frappe.model.set_value(
								dt,
								dn,
								"contract_end_date",
								parentContracts[0].end_date,
							);

							if (!frm.is_dirty()) {
								frm.save();
							}
						}
					},
				});

				frappe.call({
					method: "edp_online_vehicles.events.equip_card_linked_items.equip_card_linked_items",
					args: {
						vinno: frm.doc.vin_serial_no,
					},
					callback: function (r) {
						if (r.message) {
							let item = r.message.map((i) => i.item);
							frm.clear_table("linked_items");

							console.log(item);

							for (let row of item) {
								frm.add_child("linked_items", {
									item_code: row,
								});
								console.log(row);
							}

							frm.refresh_field("linked_items");
							frm.dirty();
							frm.save();
						} else {
							frm.clear_table("linked_items");
							frm.refresh_field("linked_items");

							frm.dirty();
							frm.save();
						}
					},
				});
			}
		}
	},
	vin_serial_no(frm) {
		if (frm.doc.vin_serial_no) {
			frm.set_value("status", "Linked");

			frappe.call({
				method: "edp_online_vehicles.events.equip_card_linked_items.equip_card_linked_items",
				args: {
					vinno: frm.doc.vin_serial_no,
				},
				callback: function (r) {
					if (r.message) {
						let item = r.message.map((i) => i.item);
						frm.doc.linked_items = [];

						console.log(item);

						for (let row of item) {
							frm.add_child("linked_items", {
								item_code: row,
							});

							console.log(row);
						}

						frm.refresh_field("linked_items");
					} else {
						frm.doc.linked_items = [];
						frm.refresh_field("linked_items");
					}
				},
			});
		} else {
			frm.set_value("status", "Unlinked");
		}
	},
});
