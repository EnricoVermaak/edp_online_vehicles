frappe.listview_settings["Reserved Vehicles"] = {
	onload: function (listview) {
		if (frappe.user.has_role("Vehicles Administrator")) {
			listview.page.add_actions_menu_item(__("Unreserve"), function () {
				const selected_docs = listview.get_checked_items();

				let vin = selected_docs.map((doc) => doc.vin_serial_no);

				const dialog = new frappe.ui.Dialog({
					title: __("Unreserve Stock"),
					fields: [
						{
							label: __("Vehicles"),
							fieldname: "selected_Vehicles",
							fieldtype: "Table",
							read_only: 1,
							cannot_add_rows: false,
							in_place_edit: false,
							fields: [
								{
									fieldname: "vin_serial_no",
									fieldtype: "Link",
									in_list_view: 1,
									label: "VIN/ Serial No",
									options: "Vehicle Stock",
									read_only: 1,
								},
							],
							data: vin.map((v) => ({ vin_serial_no: v })),
						},
					],
					primary_action_label: __("Unreserve"),
					primary_action(values) {
						frappe.call({
							method: "edp_online_vehicles.events.unreserve_vehicles.unreserve_vehicles",
							args: {
								docnames: selected_docs.map(
									(doc) => doc.vin_serial_no,
								),
							},
							callback: function (r) {
								if (r.message) {
									frappe.show_alert(
										{
											message:
												"Selected Vehicles Unreserved",
											indicator: "green",
										},
										30,
									);
								}
							},
						});
						dialog.hide();
					},
				});
				dialog.show();
			});
		}
	},
};
