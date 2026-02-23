frappe.listview_settings["Vehicle Stock"] = {
	add_fields: ["availability_status", "status"],
	hide_name_column: true,
	hide_name_filter: true,
	has_indicator_for_draft: true,

	formatters: {
		// key = fieldname in your doctype
		availability_status: function (value, field, doc) {
			// Determine pill colour
			let cls = "gray";
			if (value === "Available") cls = "green";
			else if (["Stolen", "Sold"].includes(value)) cls = "red";
			else if (
				["Active Contract", "Reserved", "Pending Sale"].includes(value)
			)
				cls = "orange";
			else if (value === "Expired Contract") cls = "dark";

			// Return an <span> with Frappe’s “indicator-pill” class plus your colour
			return `<span class="indicator-pill ${cls}">${__(value)}</span>`;
		},
	},

	onload: function (listview) {
		// Hide the default "New" button
		$('[data-label="Add Vehicle Stock"]').hide();
		listview.page.add_actions_menu_item(__('Transfer to New Warehouse'), function () {
			frappe.db.get_value("Company", { custom_active: 1 }, "name").then((r) => {
				hq_company = r?.message?.name;

				const selected_docs = listview.get_checked_items();
				const vin = selected_docs.map(d => d.name);

				const dialog = new frappe.ui.Dialog({
					title: __('Transfer to New Warehouse'),
					fields: [
						{
							label: __('To Warehouse'),
							fieldname: 'to_warehouse',
							fieldtype: 'Link',
							options: 'Warehouse',
							get_query: function () {
										return {
											filters: {
												company: hq_company,
											},
										};
									},
						},

						{
							label: __('Vehicles'),
							fieldname: 'selected_Vehicles',
							fieldtype: 'Table',
							read_only: 1,
							cannot_add_rows: true,
							in_place_edit: false,
							fields: [
								{
									fieldname: 'vin_serial_no',
									fieldtype: 'Link',
									in_list_view: 1,
									label: 'VIN/ Serial No',
									options: 'Vehicle Stock',
									read_only: 1
								}
							],
							data: vin.map(v => ({ vin_serial_no: v }))
						}
					],
					primary_action_label: __('Move'),
					primary_action(values) {
						dialog.hide();

						frappe.dom.freeze();

						frappe.call({
							method: "edp_online_vehicles.events.move_vin_to_new_warehouse.move_vin_to_new_warehouse",
							args: {
								docnames: selected_docs.map(doc => doc.name),
								to_warehouse: values.to_warehouse,
							},
							callback: function (r) {
								if (r.message == "Success") {
									frappe.dom.unfreeze();

									frappe.show_alert({
										message: __('Vehicle/s successfully transferred to warehouse ' + values.to_warehouse),
										indicator: 'green'
									}, 10);
								}
							}
						})
					}

					
				})
				dialog.show();
			});

		});
		const default_dealer = frappe.defaults.get_default("company");
		let dealers = "";

		if (frappe.user.has_role("Vehicles Administrator")) {
			listview.page.add_actions_menu_item(__("Allocate"), function () {
				const selected_docs = listview.get_checked_items();

				if (selected_docs.length === 0) {
					frappe.msgprint(__("Please select at least one document."));
					return;
				}

				const dialog = new frappe.ui.Dialog({
					title: __("Allocate Stock"),
					fields: [
						{
							label: __("Company"),
							fieldname: "company",
							fieldtype: "Link",
							options: "Company",
							reqd: 1,
						},
					],
					primary_action_label: __("Allocate"),
					primary_action(values) {
						if (!values.company) {
							frappe.msgprint(__("Please select a company."));
							return;
						}

						let company = values.company;

						console.log(company);

						// Call backend method to perform the allocation
						frappe.call({
							method: "edp_online_vehicles.events.allocate_stock.allocate_stock",
							args: {
								docnames: selected_docs.map((doc) => doc.name),
								company: company,
								user: frappe.session.user,
							},
							callback: function () {
								// Final result will be shown via real-time updates from the backend
							},
						});

						dialog.hide();
					},
				});

				dialog.show();
			});
		}

		listview.page.add_actions_menu_item(__("Reserve"), function () {
			const selected_docs = listview.get_checked_items();

			let vin = selected_docs.map((doc) => doc.name);
			let checks = [];

			vin.forEach((vinno) => {
				let check = new Promise((resolve, reject) => {
					frappe.call({
						method: "edp_online_vehicles.events.check_stock_availability.check_stock_availability",
						args: { vinno: vinno },
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(
									__(
										"Vehicle (VIN " +
										vinno +
										") is not available.",
									),
								);
								resolve(false);
							} else {
								resolve(true);
							}
						},
					});
				});
				checks.push(check);
			});

			Promise.all(checks).then((results) => {
				if (results.every((status) => status)) {
					const dialog = new frappe.ui.Dialog({
						title: __("Reserve Stock"),
						fields: [
							{
								label: __("Dealer"),
								fieldname: "dealer",
								fieldtype: "Link",
								options: "Company",
								default: default_dealer,
								reqd: 1,
							},
							{
								label: __("Customer"),
								fieldname: "customer",
								fieldtype: "Link",
								options: "Dealer Customer",
							},
							{
								label: __("Status"),
								fieldname: "status",
								fieldtype: "Select",
								options: ["Reserved"],
								default: "Reserved",
								read_only: 1,
							},
							{
								label: __("Reserve Reason"),
								fieldname: "reserve_reason",
								fieldtype: "Small Text",
								reqd: 1,
							},
							{
								label: __("Reserve From Date"),
								fieldname: "reserve_from_date",
								fieldtype: "Date",
								default: frappe.datetime.get_today(),
								reqd: 1,
							},
							{
								label: __("Reserve To Date"),
								fieldname: "reserve_to_date",
								fieldtype: "Date",
							},
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
						primary_action_label: __("Reserve"),
						primary_action(values) {
							if (
								values.reserve_to_date <
								values.reserve_from_date
							) {
								frappe.msgprint(
									__(
										"Reserve To Date cannot be earlier than Reserve From Date.",
									),
								);
								return;
							}
							frappe.call({
								method: "edp_online_vehicles.events.create_reserve_doc.create_reserve_doc",
								args: {
									docnames: selected_docs.map(
										(doc) => doc.name,
									),
									dealer: values.dealer,
									customer: values.customer,
									status: values.status,
									reserve_reason: values.reserve_reason,
									reserve_from_date: values.reserve_from_date,
									reserve_to_date: values.reserve_to_date,
								},
								callback: function (r) { },
							});
							dialog.hide();
						},
					});
					dialog.show();
				}
			});
		});

		listview.page.add_actions_menu_item(__("Retail"), function () {
			const selected_docs = listview.get_checked_items();
			let vin = selected_docs.map((doc) => doc.name);
			let checks = [];
			let dataPromises = vin.map((vinno) => {
				return frappe.db
					.get_value("Vehicle Stock", { vin_serial_no: vinno }, [
						"model",
						"brand",
						"colour",
						"description",
					])
					.then((response) => {
						if (response) {
							return {
								vin_serial_no: vinno,
								model: response.message.model || "",
								brand: response.message.brand || "",
								colour: response.message.colour || "",
								description: response.message.description || "",
							};
						}
					});
			});
			vin.forEach((vinno) => {
				let check = new Promise((resolve, reject) => {
					frappe.call({
						method: "edp_online_vehicles.events.check_stock_availability.check_stock_availability",
						args: { vinno: vinno },
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(
									__(
										"Vehicles (VIN " +
										vinno +
										") is not for sale.",
									),
								);
								resolve(false);
							} else {
								resolve(true);
							}
						},
					});
				});
				checks.push(check);
			});

				let checkDealer = new Promise((resolve) => {

					frappe.call({
						method: "edp_online_vehicles.events.check_stock_dealer.check_stock_dealer",
						args: { vins: vin },  // pass full array
						callback: function (r) {

							if (!r.message.valid) {
								frappe.msgprint(
									__("Vehicles must share a common dealer.")
								);
								resolve(false);
							} else {
								resolve(true);
							}
						}
					});

				});

				Promise.all(checks).then(results => {

					if (results.includes(false)) {
						return;
					}

					console.log("All validations passed. Continue process here.");

				});

				checks.push(checkDealer);

			frappe.call({
				method: "edp_online_vehicles.events.set_filters.get_dealers",
				args: {
					user: frappe.user.name,
				},
				callback: function (r) {
					dealers = r.message;
				},
			});

			let users = [];

			Promise.all(checks).then((results) => {
				if (results.every((status) => status)) {
				Promise.all(dataPromises).then((VehicleData) => {

					localStorage.setItem(
						"vehicle_retail_data",
						JSON.stringify(VehicleData)
					);

					frappe.set_route("Form", "Vehicle Retail", "new-vehicle-retail");
				});
				}
			});
		});

		listview.page.add_actions_menu_item(__("Apply Microdot"), function () {
			const selected_docs = listview.get_checked_items();
			let users = "";

			if (selected_docs.length > 1) {
				frappe.msgprint(
					__(
						"Please note that you can only apply one Microdot at a time. You cannot select multiple vehicles.",
					),
				);
			} else {
				let vinno = selected_docs.map((doc) => doc.name)[0];
				let old_microdot = null;
				frappe.call({
					method: "edp_online_vehicles.events.apply_microdot.check_microdot_assigned",
					args: {
						vinno: vinno,
					},
					callback: function (r) {
						old_microdot = r.message;
					},
				});
				const dialog = new frappe.ui.Dialog({
					title: __("Apply Microdot"),
					fields: [
						{
							label: __("Dealer"),
							fieldname: "dealer",
							fieldtype: "Link",
							options: "Company",
							default: default_dealer,
							reqd: 1,
							onchange: function () {
								const dealer = dialog.get_value("dealer");
								if (dealer) {
									frappe.call({
										method: "edp_online_vehicles.events.set_filters.get_users",
										args: { dealer: dealer },
										callback: function (r) {
											if (r.message) {
												users = r.message;
											}
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
							reqd: 1,
							filters: {
								status: "Received",
								dealer: default_dealer,
							},
						},
						{
							label: __("Microdot Fitted By"),
							fieldname: "microdot_fitted_by",
							fieldtype: "Link",
							options: "User",
							reqd: 1,
							get_query: function () {
								return {
									filters: {
										name: ["in", users],
									},
								};
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
							default: vinno,
							read_only: 1,
						},
					],
					primary_action_label: __("Apply Microdot"),
					primary_action(values) {
						let vinno = values.vin_serial_no;
						let microdot = values.microdot;
						let microdot_fitted_by = values.microdot_fitted_by;
						let date_applied = values.date_applied;
						frappe.call({
							method: "edp_online_vehicles.events.apply_microdot.apply_microdot",
							args: {
								vinno: vinno,
								microdot: microdot,
								microdot_fitted_by: microdot_fitted_by,
								date_applied: date_applied,
								old_microdot: old_microdot,
							},
							callback: function (r) {
								frappe.msgprint(__(r));
							},
						});
						frappe.call({
							method: "edp_online_vehicles.events.apply_microdot.add_microdot",
							args: {
								vinno: vinno,
								microdot: microdot,
								dealer: default_dealer,
								microdot_fitted_by: microdot_fitted_by,
								date_applied: date_applied,
								old_microdot: old_microdot,
							},
							callback: function (r) { },
						});

						dialog.hide();
					},
				});

				dialog.show();
			}
		});

		if (frappe.user.has_role("Vehicles Administrator")) {
			listview.page.add_actions_menu_item(__("Unreserve"), function () {
				const selected_docs = listview.get_checked_items();

				for (let doc of selected_docs) {
					if (doc.availability_status != "Reserved") {
						frappe.msgprint(
							"Vehicle " +
							doc.vin_serial_no +
							" is not reserved. Please ensure all selected vehicles are reserved.",
						);
						return;
					}
				}

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
												"Selected Vehicles have been successfully Unreserved",
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

// Listen for the final allocation result
frappe.realtime.on("allocation_result", function (result) {
	console.log("Real-time event received:", result);

	if (result === "success") {
		frappe.msgprint(__("Stock allocation successful."));
	} else {
		frappe.msgprint({
			message: result,
			indicator: "red",
		});
	}
});
