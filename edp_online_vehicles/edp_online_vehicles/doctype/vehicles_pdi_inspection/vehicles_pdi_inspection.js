// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles PDI Inspection", {
	onload(frm) {
		frm.set_query("vehicles_inspection_template", () => {
			return {
				filters: {
					type: "PDI",
				},
			};
		});

		// Filter VIN field by dealer - show only vehicles for user's company
		frm.set_query("vin_serial_no", () => {
			const user_company = frappe.defaults.get_default("company");
			
			// If user is Vehicles Administrator (HQ), they can see all vehicles
			// Otherwise, filter by user's company
			if (frappe.user.has_role("Vehicles Administrator")) {
				// HQ can see all vehicles, but if dealer is selected, filter by that dealer
				if (frm.doc.dealer) {
					return {
						filters: {
							dealer: frm.doc.dealer,
						},
					};
				}
				return {}; // No filter for HQ if no dealer selected
			} else {
				// Dealer users can only see vehicles for their company
				return {
					filters: {
						dealer: user_company,
					},
				};
			}
		});

		// Only auto-set dealer for Dealer Vehicle Administrators, not for Head Office (Vehicles Administrator)
		// Head Office should manually select the dealer
		if (!frm.doc.dealer && frappe.user.has_role("Dealer Vehicle Administrator")) {
			frm.doc.dealer = frappe.defaults.get_default("company");
		}
	},
	vehicles_inspection_template(frm, dt, dn) {
		if (frm.doc.vehicles_inspection_template) {
			frm.doc.inspection_list = [];
			frappe.db
				.get_doc(
					"Vehicles Inspection Template",
					frm.doc.vehicles_inspection_template,
				)
				.then((doc) => {
					for (let row of doc.inspection_items) {
						frm.add_child("inspection_list", {
							category: row.category,
							description: row.description,
						});
						frm.refresh_field("inspection_list");
					}
				});
		} else {
			frm.doc.inspection_list = [];
			frm.refresh_field("inspection_list");
		}
	},
	dealer(frm) {
		// When dealer changes, update VIN filter to match the selected dealer
		if (frm.doc.dealer) {
			frm.set_query("vin_serial_no", () => {
				return {
					filters: {
						dealer: frm.doc.dealer,
					},
				};
			});
		}
	},
});
