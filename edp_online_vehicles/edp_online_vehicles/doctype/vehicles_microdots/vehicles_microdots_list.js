frappe.listview_settings["Vehicles Microdots"] = {
	hide_name_column: true,

	add_fields: ["status"],

	get_indicator: function (doc) {
		if (doc.status === "Received") {
			return [__("Received"), "green", "status,=,Received"];
		} else if (doc.status === "Used") {
			return [__("Used"), "red", "status,=,Used"];
		}
	},
	onload: function (listview) {
		listview.page.add_actions_menu_item(__("Delete Docs"), function () {
			frappe.call({
				method: "edp_online_vehicles.events.delete_docs.delete_docs",
				args: {
					doctype: "Model Colour",
				},
			});
		});
		listview.page.add_actions_menu_item(__("Apply Microdot"), function () {
			const selected_docs = listview.get_checked_items();
			const dealer = frappe.defaults.get_default("company");
			if (selected_docs.length > 1) {
				frappe.msgprint(__("Please select only one vehicle."));
			} else {
				let microdot = selected_docs.map((doc) => doc.name)[0];
				frappe.call({
					method: "edp_online_vehicles.events.apply_microdot.check_microdot_status",
					args: {
						microdot: microdot,
					},
					callback: function (r) {
						if (r.message === "Used") {
							frappe.msgprint(
								__(
									"Error: The microdot has already been assigned and cannot be reused.",
								),
							);
						} else {
							let users = [];
							const dialog = new frappe.ui.Dialog({
								title: __("Apply Microdot"),
								fields: [
									{
										label: __("Dealer"),
										fieldname: "dealer",
										fieldtype: "Link",
										options: "Company",
										default: dealer,
										onchange: function () {
											const dealer =
												dialog.get_value("dealer");
											if (dealer) {
												frappe.call({
													method: "edp_online_vehicles.events.set_filters.get_users",
													args: { dealer: dealer },
													callback: function (r) {
														users = r.message;
													},
												});
											}
										},
									},
									{
										label: __("Microdot"),
										fieldname: "microdot",
										fieldtype: "Link",
										options: "Vehicles Microdots",
										read_only: 1,
										default: microdot,
									},
									{
										label: __("Microdot Fitted By"),
										fieldname: "microdot_fitted_by",
										fieldtype: "Link",
										options: "User",
										reqd: 1,
										get_query: function () {
											const dealer =
												dialog.get_value("dealer");
											if (dealer) {
												return {
													filters: {
														email: ["in", users],
													},
												};
											}
											return {};
										},
									},
									{
										label: __("Date Applied"),
										fieldname: "date_applied",
										fieldtype: "Datetime",
										default: frappe.datetime.now_datetime(),
										reqd: 1,
									},
									{
										label: __("Vin/ Serial No"),
										fieldname: "vin_serial_no",
										fieldtype: "Link",
										options: "Vehicle Stock",
										reqd: 1,
										filters: {
											microdot: "",
											dealer: dealer,
										},
									},
								],
								primary_action_label: __("Apply Microdot"),
								primary_action(values) {
									let vinno = values.vin_serial_no;
									let microdot = values.microdot;
									let microdot_fitted_by =
										values.microdot_fitted_by;
									let date_applied = values.date_applied;
									frappe.call({
										method: "edp_online_vehicles.events.apply_microdot.apply_microdot",
										args: {
											vinno: vinno,
											microdot: microdot,
											microdot_fitted_by:
												microdot_fitted_by,
											date_applied: date_applied,
										},
										callback: function (r) {},
									});
									frappe.call({
										method: "edp_online_vehicles.events.apply_microdot.add_microdot",
										args: {
											vinno: vinno,
											microdot: microdot,
											microdot_fitted_by:
												microdot_fitted_by,
											date_applied: date_applied,
											dealer: dealer,
										},
										callback: function (r) {},
									});
									dialog.hide();
									frappe.msgprint(
										"Microdot successfully applied to vehicle (VIN: " +
											values.vin_serial_no +
											")",
									);
								},
							});
							dialog.show();
						}
					},
				});
			}
		});
	},
};
