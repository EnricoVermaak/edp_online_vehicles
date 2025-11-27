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

		// listview.page.add_actions_menu_item(__("UON sftp"), function () {
		// 		frappe.call({
		// 					///home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/events/uon_integration.py
		// 					method: "edp_online_vehicles.events.uon_integration.uon_sftp",
		// 					args: {
		// 						// docnames: selected_docs.map((doc) => doc.name),
		// 						// company: company,
		// 						// user: frappe.session.user,
		// 					},
		// 					callback: function () {
		// 						// Final result will be shown via real-time updates from the backend
		// 					},
		// 				});
		// 	});
		// listview.page.add_actions_menu_item(__("outgoing_vehicles_stock"), function () {
		// 		frappe.call({
		// 					///home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/events/uon_integration.py
		// 					method: "edp_online_vehicles.events.uon_integration.outgoing_vehicles_stock",
		// 					args: {
		// 						// docnames: selected_docs.map((doc) => doc.name),
		// 						// company: company,
		// 						// user: frappe.session.user,
		// 					},
		// 					callback: function () {
		// 						// Final result will be shown via real-time updates from the backend
		// 					},
		// 				});
		// 	});	
		// listview.page.add_actions_menu_item(__("outgoing_vehicles_in_transit"), function () {
		// 		frappe.call({
		// 					///home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/events/uon_integration.py
		// 					method: "edp_online_vehicles.events.uon_integration.outgoing_vehicles_in_transit",
		// 					args: {
		// 						// docnames: selected_docs.map((doc) => doc.name),
		// 						// company: company,
		// 						// user: frappe.session.user,
		// 					},
		// 					callback: function () {
		// 						// Final result will be shown via real-time updates from the backend
		// 					},
		// 				});
		// 	});		
		// listview.page.add_actions_menu_item(__("outgoing_dealer_stock"), function () {
		// 		frappe.call({
		// 					///home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/events/uon_integration.py
		// 					method: "edp_online_vehicles.events.uon_integration.outgoing_dealer_stock",
		// 					args: {
		// 						// docnames: selected_docs.map((doc) => doc.name),
		// 						// company: company,
		// 						// user: frappe.session.user,
		// 					},
		// 					callback: function () {
		// 						// Final result will be shown via real-time updates from the backend
		// 					},
		// 				});
		// 	});	
		// listview.page.add_actions_menu_item(__("outgoing_retail"), function () {
		// 		frappe.call({
		// 					///home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/events/uon_integration.py
		// 					method: "edp_online_vehicles.events.uon_integration.outgoing_retail",
		// 					args: {
		// 						// docnames: selected_docs.map((doc) => doc.name),
		// 						// company: company,
		// 						// user: frappe.session.user,
		// 					},
		// 					callback: function () {
		// 						// Final result will be shown via real-time updates from the backend
		// 					},
		// 				});
		// 	});		
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
								callback: function (r) {},
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
											") is not available for sale.",
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

			frappe.call({
				method: "edp_online_vehicles.events.set_filters.get_dealers",
				args: {
					user: frappe.user.name,
				},
				callback: function (r) {
					dealers = r.message;
				},
			});

			Promise.all(checks).then((results) => {
				if (results.every((status) => status)) {
					Promise.all(dataPromises).then((VehicleData) => {
						const dialog = new frappe.ui.Dialog({
							title: __("Sell Vehicles"),
							size: "extra-large",
							fields: [
								{
									label: __("Dealer"),
									fieldname: "dealer",
									fieldtype: "Link",
									options: "Company",
									default:
										frappe.defaults.get_default("company"),
									reqd: 1,
									get_query: function () {
										return {
											filters: {
												name: ["in", dealers],
											},
										};
									},
								},
								{
									label: __("Sale Type"),
									fieldname: "sale_type",
									fieldtype: "Link",
									options: "Vehicle Sale Type",
									reqd: 1,
								},
								{
									label: __("Finance Method"),
									fieldname: "finance_method",
									fieldtype: "Select",
									options: ["", "Bank", "Cash"],
									reqd: 1,
								},
								{
									label: __("Financed By"),
									fieldname: "finance_by",
									fieldtype: "Link",
									options: "Financed By",
									hidden: 1,
								},
								{
									fieldtype: "Column Break",
									hide_border: 1,
								},
								{
									label: __("Status"),
									fieldname: "status",
									fieldtype: "Select",
									default: "Pending",
									reqd: 1,
									read_only: 1,
								},
								{
									label: __("Sales Person"),
									fieldname: "sales_person",
									fieldtype: "Link",
									options: "Sales Person",
									reqd: 1,
									get_query: function () {
										return {
											filters: {
												enabled: 1,
											},
										};
									},
								},
								{
									label: __("Customer"),
									fieldname: "customer",
									fieldtype: "Link",
									options: "Dealer Customer",
									reqd: 1,
								},
								{
									fieldtype: "Section Break",
									hide_border: 1,
								},
								{
									label: __("Vehicle Sale Items"),
									fieldname: "vehicles_sale_items",
									fieldtype: "Table",
									options: "Vehicle Sale Items",
									in_place_edit: false,
									cannot_add_rows: true,
									data: VehicleData,
									fields: [
										{
											fieldname: "vin_serial_no",
											fieldtype: "Link",
											in_list_view: 1,
											label: "VIN/ Serial No",
											read_only: 1,
											columns: 2,
										},
										{
											fieldname: "brand",
											fieldtype: "Data",
											in_list_view: 1,
											label: "Brand",
											read_only: 1,
											columns: 2,
										},
										{
											fieldname: "model",
											fieldtype: "Data",
											in_list_view: 1,
											label: "Model",
											read_only: 1,
											columns: 2,
										},
										{
											fieldname: "description",
											fieldtype: "Data",
											in_list_view: 1,
											label: "Description",
											read_only: 1,
											columns: 2,
										},
										{
											fieldname: "colour",
											fieldtype: "Data",
											in_list_view: 1,
											label: "Colour",
											read_only: 1,
											columns: 1,
										},
										{
											fieldname: "retail_amount",
											fieldtype: "Currency",
											precision: 2,
											in_list_view: 1,
											label: "Customer Retail Amount",
											reqd: 1,
											columns: 1,
											read_only: 0,
										},
									],
								},
							],
							primary_action_label: __("Sell"),
							primary_action(values) {
								if (values.finance_method === "Cash") {
									values.finance_by = null;
								}
						const dialogSaleItems =
							dialog.get_value("vehicles_sale_items") || [];

						frappe.model.with_doctype("Vehicle Retail", function () {
							const retailDoc =
								frappe.model.get_new_doc("Vehicle Retail");

							retailDoc.dealer = values.dealer;
							retailDoc.status = values.status;
							retailDoc.sale_type = values.sale_type;
							retailDoc.finance_method = values.finance_method;
							retailDoc.sales_person = values.sales_person;
							retailDoc.customer = values.customer;

							if (values.finance_by) {
								retailDoc.financed_by = values.finance_by;
							}

							dialogSaleItems.forEach((item) => {
								const row = frappe.model.add_child(
									retailDoc,
									"vehicles_sale_items",
								);
								row.vin_serial_no = item.vin_serial_no;
								row.model = item.model;
								row.colour = item.colour;
								row.interior_colour = item.interior_colour;
								row.retail_amount = item.retail_amount;
							});

							frappe.set_route(
								"Form",
								retailDoc.doctype,
								retailDoc.name,
							);
							dialog.hide();
						});
							},
						});

						dialog.fields_dict.finance_method.$input.on(
							"change",
							function () {
								const financeMethod =
									dialog.get_value("finance_method");
								const financeByField =
									dialog.fields_dict.finance_by;

								if (financeMethod === "Bank") {
									financeByField.df.reqd = 1;
									financeByField.df.hidden = 0;
									financeByField.refresh();
								} else {
									financeByField.df.reqd = 0;
									financeByField.df.hidden = 1;
									financeByField.refresh();
								}
							},
						);

						dialog.show();
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
							callback: function (r) {},
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

		if (frappe.user.has_role("Vehicles Administrator")) {
			listview.page.add_actions_menu_item(__("Transfer to New Warehouse"), function () {
				const selected_docs = listview.get_checked_items();

				if (selected_docs.length === 0) {
					frappe.msgprint(__("Please select at least one vehicle."));
					return;
				}

				let vin = selected_docs.map((doc) => doc.name);

				const dialog = new frappe.ui.Dialog({
					title: __("Transfer to New Warehouse"),
					fields: [
						{
							label: __("To Warehouse"),
							fieldname: "to_warehouse",
							fieldtype: "Link",
							options: "Warehouse",
							reqd: 1,
						},
						{
							label: __("Vehicles"),
							fieldname: "selected_Vehicles",
							fieldtype: "Table",
							read_only: 1,
							cannot_add_rows: true,
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
					primary_action_label: __("Move"),
					primary_action(values) {
						if (!values.to_warehouse) {
							frappe.msgprint(__("Please select a warehouse."));
							return;
						}

						dialog.hide();

						frappe.dom.freeze();

						frappe.call({
							method: "edp_online_vehicles.events.move_vin_to_new_warehouse.move_vin_to_new_warehouse",
							args: {
								docnames: selected_docs.map((doc) => doc.name),
								to_warehouse: values.to_warehouse,
							},
							callback: function (r) {
								frappe.dom.unfreeze();

								if (r.message == "Success") {
									frappe.show_alert(
										{
											message:
												__(
													"Vehicle/s successfully transferred to warehouse " +
														values.to_warehouse,
												),
											indicator: "green",
										},
										10,
									);
									listview.refresh();
								} else {
									frappe.show_alert(
										{
											message: __("An error occurred during transfer."),
											indicator: "red",
										},
										10,
									);
								}
							},
						});
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
