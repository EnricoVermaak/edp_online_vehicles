// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Fleet Customer", {
	refresh(frm) {
		if (frm.doc.country) {
			frappe.call({
				method: "edp_online_vehicles.events.get_country_doc.get_country_doc",
				args: {
					country: frm.doc.country,
				},
				callback: function (r) {
					if (r.message) {
						var country_data = r.message;

						var region_options = [];

						(country_data.custom_regions || []).forEach(
							function (regions_row) {
								region_options.push({
									label: regions_row.region,
									value: regions_row.region,
								});
							},
						);

						var field = frm.fields_dict.province_state;
						field.df.options = region_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}
	},

	country(frm) {
		if (frm.doc.country) {
			frappe.call({
				method: "edp_online_vehicles.events.get_country_doc.get_country_doc",
				args: {
					country: frm.doc.country,
				},
				callback: function (r) {
					if (r.message) {
						var country_data = r.message;

						var region_options = [];

						(country_data.custom_regions || []).forEach(
							function (regions_row) {
								region_options.push({
									label: regions_row.region,
									value: regions_row.region,
								});
							},
						);

						var field = frm.fields_dict.province_state;
						field.df.options = region_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}
	},

	before_save(frm) {
		if (frm.is_new() && !frm.doc.fleet_code) {
			frappe.db
				.get_single_value("Vehicle Stock Settings", "last_fleet_no")
				.then((last_fleet_no) => {
					frappe.db
						.get_single_value(
							"Vehicle Stock Settings",
							"fleet_customer_prefix",
						)
						.then((fleet_customer_prefix) => {
							let prefix = last_fleet_no.slice(0, -6);

							if (prefix === fleet_customer_prefix) {
								let number = last_fleet_no.slice(-6);

								let incremented = String(
									parseInt(number, 10) + 1,
								).padStart(6, "0");

								let new_fleet_no = prefix + incremented;

								frm.doc.fleet_code = new_fleet_no;
							} else {
								prefix = fleet_customer_prefix + "%";
								frappe.call({
									method: "frappe.client.get_list",
									args: {
										doctype: "Fleet Customer",
										filters: [
											["fleet_code", "like", prefix],
										],
										fields: ["fleet_code"],
										limit_page_length: 1000,
									},
									callback: function (response) {
										if (response.message) {
											let regex = new RegExp(
												`^${fleet_customer_prefix}\\d{6}$`,
											);

											const validFleetCodes =
												response.message
													.map(
														(record) =>
															record.fleet_code,
													)
													.filter((code) =>
														regex.test(code),
													);

											let maxFleetCode =
												validFleetCodes.reduce(
													(max, code) => {
														let numericPart =
															parseInt(
																code.match(
																	/\d+/,
																)[0],
															);

														return numericPart >
															max.numericPart
															? {
																	numericPart,
																	fleetCode:
																		code,
																}
															: max;
													},
													{
														numericPart: 0,
														fleetCode: "",
													},
												).fleetCode;

											if (maxFleetCode) {
												let number =
													maxFleetCode.slice(-6);

												let incremented = String(
													parseInt(number, 10) + 1,
												).padStart(6, "0");
												let new_fleet_no =
													fleet_customer_prefix +
													incremented;

												frm.doc.fleet_code =
													new_fleet_no;
											} else {
												frm.doc.fleet_code =
													fleet_customer_prefix +
													"000001";
											}
										}
									},
								});
							}
						});
				});
		}

		if (frm.is_new() && frm.doc.company_reg_no) {
			const reg_no = frm.doc.company_reg_no;
			const cleaned_reg_no = reg_no.replace(/\s/g, "");

			frm.set_value("company_reg_no", cleaned_reg_no);
		}

		//     frappe.db.get_single_value('Vehicle Stock Settings','last_fleet_no')
		//     .then(last_fleet_no => {

		//         // let fleetNumber = "FLEET000123";
		//         let prefix = last_fleet_no.slice(0, -6);

		//         let number = last_fleet_no.slice(-6);

		//         let incremented = String(parseInt(number, 10) + 1).padStart(6, "0");
		//         let new_fleet_no = prefix + incremented;

		//         frm.doc.fleet_code = new_fleet_no

		//     })
		// }
	},
	after_save(frm) {
		frappe.db.set_value(
			"Vehicle Stock Settings",
			null,
			"last_fleet_no",
			frm.doc.fleet_code,
		);
	},
});
