// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let show_only_retail = "";
let show_only_original_dealer = "";
let previous_status = "";
let previous_claim_amount = "";
frappe.ui.form.on("Dealer Claims", {
	onload: function (frm) {
		if (frm.is_new()) {
			frm.doc.dealer = frappe.defaults.get_default("company");
		}
		// listview.page.add_actions_menu_item(__('Delete Dos'), function() {
	},
	// table_exgk_add: function(frm, cdt, cdn) {
	// 	let row = locals[cdt][cdn];

	// 	frappe.ui.form.on(cdt, {
	// 		vin_serial_no: function(frm, cdt2, cdn2) {
	// 			let child_row = locals[cdt2][cdn2];
	// 			if (child_row.vin_serial_no) {

	// 				// 🔹 1. Check if vehicle belongs to this dealer
	// 				frappe.call({
	// 					method: "frappe.client.get",
	// 					args: {
	// 						doctype: "Vehicle Stock",
	// 						name: child_row.vin_serial_no
	// 					},
	// 					callback: function(r) {
	// 						if (r.message) {
	// 							if (r.message.original_purchasing_dealer && r.message.original_purchasing_dealer !== frm.doc.dealer) {
	// 								frappe.msgprint("❌ Vehicle was not purchased by the selected dealership on this claim.");
	// 								frappe.model.set_value(cdt2, cdn2, "vin_serial_no", ""); // clear field
	// 								return;
	// 							}

	// 							// 🔹 2. Check if VIN already claimed under same category
	// 							frappe.call({
	// 								method: "frappe.db.sql",
	// 								args: {
	// 									query: `
	// 										SELECT parent.name
	// 										FROM \`tabVehicles Item\` AS child
	// 										JOIN \`tabDealer Claims\` AS parent
	// 										ON child.parent = parent.name
	// 										WHERE parent.claim_category = %s
	// 										AND child.vin_serial_no = %s
	// 										AND parent.name != %s
	// 									`,
	// 									values: [frm.doc.claim_category, child_row.vin_serial_no, frm.doc.name]
	// 								},
	// 								callback: function(res) {
	// 									if (res.message && res.message.length > 0) {
	// 										frappe.msgprint(
	// 											`❌ VIN ${child_row.vin_serial_no} has already been claimed under category '${frm.doc.claim_category}'.`
	// 										);
	// 										frappe.model.set_value(cdt2, cdn2, "vin_serial_no", "");
	// 									}
	// 								}
	// 							});
	// 						}
	// 					}
	// 				});
	// 			}
	// 		}
	// 	});
	// },
	refresh(frm) {
		// Child table field filter for VIN
        frm.fields_dict["table_exgk"].grid.get_field("vin_serial_no").get_query = function(doc, cdt, cdn) {

            // agar fleet_customer blank hai → saare Vehicle Stock records show karo
            if (!frm.doc.fleet_customer) {
                return {
                    filters: {}
                };
            }

            // otherwise, sirf unhi VINs ko dikhao jinka fleet_no == fleet_customer
            return {
                filters: {
                    fleet_no: frm.doc.fleet_customer
                }
            };
        };



		let is_allowed = frappe.user_roles.includes("Vehicles Administrator");
		frm.toggle_enable("claim_amt", is_allowed);

		// frm.fields_dict['documents'].grid.get_field('document').reqd = true;
		frm.fields_dict["documents"].grid.wrapper
			.find(".grid-remove-rows")
			.hide();
		frm.get_field("documents").grid.cannot_add_rows = true;

		if (frm.doc.fleet_customer) {
			if (frm.show_only_retail === 1) {
				if (frm.show_only_original_dealer === 1) {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
								original_purchasing_dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												availability_status: "Sold",
												fleet_customer:
													frm.doc.fleet_customer,
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				} else {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												availability_status: "Sold",
												fleet_customer:
													frm.doc.fleet_customer,
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				}
			} else {
				if (frm.show_only_original_dealer === 1) {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
								original_purchasing_dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												fleet_customer:
													frm.doc.fleet_customer,
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				} else {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												fleet_customer:
													frm.doc.fleet_customer,
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				}
			}
		} else if (frm.show_only_retail === 1) {
			if (frm.show_only_original_dealer === 1) {
				if (frm.doc.dealer) {
					frappe.call({
						method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
						args: {
							dealer: frm.doc.dealer,
							original_purchasing_dealer: frm.doc.dealer,
						},
						callback: function (r) {
							if (r.message) {
								let vinnos = r.message;

								frm.fields_dict["table_exgk"].grid.get_field(
									"vin_serial_no",
								).get_query = function (doc, cdt, cdn) {
									return {
										filters: {
											availability_status: "Sold",
											name: ["not in", vinnos],
										},
									};
								};
							}
						},
					});
				}
			} else {
				if (frm.doc.dealer) {
					frappe.call({
						method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
						args: {
							dealer: frm.doc.dealer,
						},
						callback: function (r) {
							if (r.message) {
								let vinnos = r.message;

								frm.fields_dict["table_exgk"].grid.get_field(
									"vin_serial_no",
								).get_query = function (doc, cdt, cdn) {
									return {
										filters: {
											availability_status: "Sold",
											name: ["not in", vinnos],
										},
									};
								};
							}
						},
					});
				}
			}
		} else if (frm.show_only_original_dealer === 1) {
			if (frm.doc.dealer) {
				frappe.call({
					method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
					args: {
						dealer: frm.doc.dealer,
						original_purchasing_dealer: frm.doc.dealer,
					},
					callback: function (r) {
						if (r.message) {
							let vinnos = r.message;

							frm.fields_dict["table_exgk"].grid.get_field(
								"vin_serial_no",
							).get_query = function (doc, cdt, cdn) {
								return {
									filters: {
										name: ["not in", vinnos],
									},
								};
							};
						}
					},
				});
			}
		}

		if (frm.doc.claim_category) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Dealer Claim Category",
					name: frm.doc.claim_category,
				},
				callback: function (r) {
					if (r.message) {
						var claim_category_data = r.message;

						var category_options = [];

						(claim_category_data.claim_types || []).forEach(
							function (category_row) {
								category_options.push({
									label: category_row.claim_type_description,
									value: category_row.claim_type_description,
								});
							},
						);

						var field = frm.fields_dict.claim_description;
						field.df.options = category_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}

		previous_status = frm.doc.claim_status;
		previous_claim_amount = frm.doc.claim_amt;
	},
	claim_category: function (frm) {
		if (frm.doc.claim_category) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Dealer Claim Category",
					name: frm.doc.claim_category,
				},
				callback: function (r) {
					if (r.message) {
						var claim_category_data = r.message;

						var category_options = [];
						frm.claim_types_data = {};
						frm.claim_types_mandatory_vin = {};
						frm.claim_types_mandatory_part = {};
						frm.claim_types_retail_only = {};
						frm.claim_types_original_dealer_only = {};

						(claim_category_data.claim_types || []).forEach(
							function (category_row) {
								category_options.push({
									label: category_row.claim_type_description,
									value: category_row.claim_type_description,
								});
								frm.claim_types_data[
									category_row.claim_type_description
								] = category_row.claim_type_code;
								frm.claim_types_mandatory_vin[
									category_row.claim_type_description
								] = category_row.vin_serial_no_mandatory;
								frm.claim_types_mandatory_part[
									category_row.claim_type_description
								] = category_row.parts_mandatory;
								frm.claim_types_retail_only[
									category_row.claim_type_description
								] = category_row.only_allow_retailed_units;
								frm.claim_types_original_dealer_only[
									category_row.claim_type_description
								] =
									category_row.only_allow_original_purchasing_dealer;
							},
						);

						var field = frm.fields_dict.claim_description;
						field.df.options = category_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();

						let get_docs = claim_category_data.documents;

						frm.clear_table("documents");

						// Check if get_docs is available and not empty
						if (get_docs && get_docs.length) {
							// Loop through each document and add only the document_name
							get_docs.forEach(function (doc) {
								let child = frm.add_child("documents");
								child.document_name = doc.document_name;
							});
						}

						frm.refresh_field("documents");
					}
				},
			});
		}
	},
	claim_description: function (frm) {
		if (frm.doc.claim_description && frm.claim_types_data) {
			var selected_code = frm.claim_types_data[frm.doc.claim_description];
			frm.set_value("claim_type_code", selected_code);

			frm.set_df_property("fleet_customer", "reqd", 0);
			frm.set_df_property("company_registration_no", "reqd", 0);

			frappe.db
				.get_doc("Dealer Claim Category", frm.doc.claim_category)
				.then((res) => {
					let claim_types = res.claim_types;
					claim_types.forEach((type) => {
						if (
							type.claim_type_description ===
							frm.doc.claim_description
						) {
							if (type.mandatory_fleet_customer === 1) {
								frm.set_df_property(
									"fleet_customer",
									"reqd",
									1,
								);
								frm.set_df_property(
									"company_registration_no",
									"reqd",
									1,
								);
							}
						}
					});
				});

			if (frm.claim_types_mandatory_vin) {
				frm.clear_table("table_exgk");

				var mandatory_vin =
					frm.claim_types_mandatory_vin[frm.doc.claim_description];

				if (mandatory_vin) {
					frm.toggle_reqd("table_exgk", mandatory_vin == 1);
				}

				frm.refresh_field("table_exgk");
			}

			if (frm.claim_types_mandatory_part) {
				frm.clear_table("claim_parts");

				var mandatory_part =
					frm.claim_types_mandatory_part[frm.doc.claim_description];

				if (mandatory_part) {
					frm.toggle_reqd("claim_parts", mandatory_part == 1);
				}

				frm.refresh_field("claim_parts");
			}

			if (frm.claim_types_retail_only) {
				frm.show_only_retail =
					frm.claim_types_retail_only[frm.doc.claim_description];
			}

			if (frm.claim_types_original_dealer_only) {
				frm.show_only_original_dealer =
					frm.claim_types_original_dealer_only[
						frm.doc.claim_description
					];
			}

			if (frm.doc.fleet_customer) {
				if (frm.show_only_retail === 1) {
					if (frm.show_only_original_dealer === 1) {
						if (frm.doc.dealer) {
							frappe.call({
								method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
								args: {
									dealer: frm.doc.dealer,
									original_purchasing_dealer: frm.doc.dealer,
								},
								callback: function (r) {
									if (r.message) {
										let vinnos = r.message;

										frm.fields_dict[
											"table_exgk"
										].grid.get_field(
											"vin_serial_no",
										).get_query = function (doc, cdt, cdn) {
											return {
												filters: {
													availability_status: "Sold",
													fleet_customer:
														frm.doc.fleet_customer,
													name: ["not in", vinnos],
												},
											};
										};
									}
								},
							});
						}
					} else {
						if (frm.doc.dealer) {
							frappe.call({
								method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
								args: {
									dealer: frm.doc.dealer,
								},
								callback: function (r) {
									if (r.message) {
										let vinnos = r.message;

										frm.fields_dict[
											"table_exgk"
										].grid.get_field(
											"vin_serial_no",
										).get_query = function (doc, cdt, cdn) {
											return {
												filters: {
													availability_status: "Sold",
													fleet_customer:
														frm.doc.fleet_customer,
													name: ["not in", vinnos],
												},
											};
										};
									}
								},
							});
						}
					}
				} else {
					if (frm.show_only_original_dealer === 1) {
						if (frm.doc.dealer) {
							frappe.call({
								method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
								args: {
									dealer: frm.doc.dealer,
									original_purchasing_dealer: frm.doc.dealer,
								},
								callback: function (r) {
									if (r.message) {
										let vinnos = r.message;

										frm.fields_dict[
											"table_exgk"
										].grid.get_field(
											"vin_serial_no",
										).get_query = function (doc, cdt, cdn) {
											return {
												filters: {
													fleet_customer:
														frm.doc.fleet_customer,
													name: ["not in", vinnos],
												},
											};
										};
									}
								},
							});
						}
					} else {
						if (frm.doc.dealer) {
							frappe.call({
								method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
								args: {
									dealer: frm.doc.dealer,
								},
								callback: function (r) {
									if (r.message) {
										let vinnos = r.message;

										frm.fields_dict[
											"table_exgk"
										].grid.get_field(
											"vin_serial_no",
										).get_query = function (doc, cdt, cdn) {
											return {
												filters: {
													fleet_customer:
														frm.doc.fleet_customer,
													name: ["not in", vinnos],
												},
											};
										};
									}
								},
							});
						}
					}
				}
			} else if (frm.show_only_retail === 1) {
				if (frm.show_only_original_dealer === 1) {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
								original_purchasing_dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												availability_status: "Sold",
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				} else {
					if (frm.doc.dealer) {
						frappe.call({
							method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
							args: {
								dealer: frm.doc.dealer,
							},
							callback: function (r) {
								if (r.message) {
									let vinnos = r.message;

									frm.fields_dict[
										"table_exgk"
									].grid.get_field(
										"vin_serial_no",
									).get_query = function (doc, cdt, cdn) {
										return {
											filters: {
												availability_status: "Sold",
												name: ["not in", vinnos],
											},
										};
									};
								}
							},
						});
					}
				}
			} else if (frm.show_only_original_dealer === 1) {
				if (frm.doc.dealer) {
					frappe.call({
						method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_vehicle_check",
						args: {
							dealer: frm.doc.dealer,
							original_purchasing_dealer: frm.doc.dealer,
						},
						callback: function (r) {
							if (r.message) {
								let vinnos = r.message;

								frm.fields_dict["table_exgk"].grid.get_field(
									"vin_serial_no",
								).get_query = function (doc, cdt, cdn) {
									return {
										filters: {
											name: ["not in", vinnos],
										},
									};
								};
							}
						},
					});
				}
			}
		}
	},
	claim_datetime: function (frm) {
		var claim_date = "";
		var diff_in_days = "";

		if (frm.doc.final_status_date) {
			claim_date = frm.doc.claim_datetime;
			var final_date = frm.doc.final_status_date;

			// Calculate the difference in days, considering the datetime
			diff_in_days = frappe.datetime.get_diff(final_date, claim_date);

			// Set the calculated days in claim_age field
			frm.set_value("claim_age", diff_in_days);
		} else {
			claim_date = frm.doc.claim_datetime;
			var now = frappe.datetime.now_datetime();

			// Calculate the difference in days, considering the datetime
			diff_in_days = frappe.datetime.get_diff(now, claim_date);

			// Set the calculated days in claim_age field
			frm.set_value("claim_age", diff_in_days);
		}
	},
	before_save: function (frm) {
		if (!frm.is_new()) {
			if (frm.doc.claim_datetime) {
				var claim_date = "";
				var diff_in_days = "";

				if (frm.doc.final_status_date) {
					claim_date = frm.doc.claim_datetime;
					var final_date = frm.doc.final_status_date;

					// Calculate the difference in days, considering the datetime
					diff_in_days = frappe.datetime.get_diff(
						final_date,
						claim_date,
					);

					// Set the calculated days in claim_age field
					frm.set_value("claim_age", diff_in_days);
				} else {
					claim_date = frm.doc.claim_datetime;
					var now = frappe.datetime.now_datetime();

					// Calculate the difference in days, considering the datetime
					diff_in_days = frappe.datetime.get_diff(now, claim_date);

					// Set the calculated days in claim_age field
					frm.set_value("claim_age", diff_in_days);
				}
			}
		}

		if (
			frm.doc.claim_status === "Approved for Remittance" ||
			frm.doc.claim_status === "Claim Declined" ||
			frm.doc.claim_status === "Cancelled"
		) {
			frm.doc.final_status_date = frappe.datetime.now_datetime();
		}

		frm.doc["table_exgk"].forEach(function (row) {
			if (row.vin_serial_no) {
				frappe.db
					.get_doc("Dealer Claim Category", frm.doc.claim_category)
					.then((res) => {
						res.claim_types.forEach(function (r) {
							if (r.claim_type_code == frm.doc.claim_type_code) {
								if (!r.allow_duplicate_claim) {
									frappe.call({
										method: "edp_online_vehicles.events.dealer_claim_check.dealer_claim_duplicate_check",
										args: {
											vinno: row.vin_serial_no,
											dealer: frm.doc.dealer,
											claim_type_code:
												frm.doc.claim_type_code,
											docname: frm.doc.name,
										},
										callback: function (r) {
											if (
												r.message &&
												r.message.length > 0
											) {
												frappe.model.set_value(
													row.doctype,
													row.name,
													"vin_serial_no",
													null,
												);
												frappe.throw(
													"You cannot load the same claim for this vehicle more than once.",
												);
											}
										},
									});
								}
							}
						});
					});
			}
		});
		if (frm.doc.claim_status === "Pending") {
			frm.doc.claim_status = "Claim Submitted";
		}

		frm.doc["documents"].forEach(function (row) {
			if (!row.document) {
				// frappe.throw('Please attach ' + row.document_name)
				frappe.show_alert(
					{
						message: "Please attach " + row.document_name,
					},
					5,
				);
				frappe.validated = false;
			}
		});

		// if (vehicle_table.length > 0 && part_table.length > 0) {
		//     frappe.throw("You cannot claim for Vehicles and Parts on Dealer Claims. Please create separate claim documents for each.");
		// }
	},
	after_save: function (frm) {
		if (frm.doc.claim_status) {
			if (previous_status != frm.doc.claim_status) {
				frappe.call({
					method: "edp_online_vehicles.events.status_tracking.status_tracking",
					args: {
						doc_id: frm.doc.name,
						status: frm.doc.claim_status,
						previous_status: previous_status,
						doctype: frm.doc.doctype,
					},
				});
			}
		}
	},
	company_registration_no(frm) {
		// if (frm.doc.company_registration_no) {
		//     frappe.call({
		//         method: "edp_online_vehicles.events.search_customer.search_fleet_customer",
		//         args: {
		//             reg_no: frm.doc.company_registration_no
		//         },
		//         callback: function(r) {
		//             if (!(r.message && r.message.fleet_customer === frm.doc.fleet_customer)) {
		//                 frm.set_value("fleet_customer_name", null);
		//                 frm.set_value("fleet_customer", null);
		//                 frm.set_value("fleet_customer_mobile", null);
		//                 frm.clear_table("table_exgk");
		//                 frm.refresh_field("table_exgk");
		//             }
		//         }
		//     });
		// }
	},
	fleet_code(frm) {
		// if (frm.doc.fleet_code) {
		//     if (frm.show_only_retail === 1) {
		//         frm.fields_dict['table_exgk'].grid.get_field('vin_serial_no').get_query = function(doc, cdt, cdn) {
		//             return {
		//                 filters: {
		//                     availability_status: 'Sold',
		//                     fleet_code: frm.doc.fleet_code
		//                 },
		//             };
		//         };
		//     } else {
		//         frm.fields_dict['table_exgk'].grid.get_field('vin_serial_no').get_query = function(doc, cdt, cdn) {
		//             return {
		//                 filters: {
		//                     fleet_code: frm.doc.fleet_code
		//                 },
		//             };
		//         };
		//     }
		// } else
		// if (frm.show_only_retail === 1) {
		//     // if (frm.show_only_retail === 1) {
		//     frm.fields_dict['table_exgk'].grid.get_field('vin_serial_no').get_query = function(doc, cdt, cdn) {
		//         return {
		//             filters: {
		//                 availability_status: 'Sold',
		//             },
		//         };
		//         // };
		//     }
		// }
	},
	search(frm) {
		if (frm.doc.company_registration_no) {
			frappe.call({
				method: "edp_online_vehicles.events.search_customer.get_fleet_cust_data",
				args: {
					reg_no: frm.doc.company_registration_no,
				},
				callback: function (r) {
					if (r.message) {
						let full_name = r.message[1] + " " + r.message[2];

						frm.set_value("fleet_customer_name", full_name);
						frm.set_value("fleet_customer", r.message[0]);
						frm.set_value("fleet_customer_mobile", r.message[3]);

						let reg_no = frm.doc.company_registration_no;
						let cleaned_reg_no = reg_no.replace(/\s/g, "");

						frm.set_value(
							"company_registration_no",
							cleaned_reg_no,
						);

						if (frm.doc.table_exgk) {
							frm.clear_table("table_exgk");
							frm.refresh_field("table_exgk");
						}
					} else {
						frm.set_value("company_registration_no", null);
						//Here - Monique
						frm.set_value("fleet_customer_name", "");
						frm.set_value("fleet_customer", "");
						//Here - Monique
						frappe.throw(__("Fleet customer not found."));
					}
				},
			});
		}
	},

	claim_amt(frm) {
		if (frm.doc.claim_amt) {
			if (
				frm.doc.claim_amt > previous_claim_amount &&
				previous_claim_amount != 0
			) {
				frm.set_value("claim_amt", previous_claim_amount);

				frappe.msgprint(
					"You cannot set claim amount to a higher amount than it was previously. You can only set a lower amount.",
				);
			}
		}
	},
});

frappe.ui.form.on("Vehicles Item", {
    vin_serial_no: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // Step 1: Claim type check
        if (!frm.doc.claim_type_code) {
            if (row.vin_serial_no) {
                frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
                frappe.msgprint("Please select a Claim type before selecting a vehicle");
            }
            return;
        }

        if (!row.vin_serial_no) return;

        // Step 2: Check if Vehicle belongs to selected dealer
        try {
            let vehicle_res = await frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Vehicle Stock",
                    name: row.vin_serial_no,
                },
            });

            if (
                vehicle_res.message &&
                vehicle_res.message.original_purchasing_dealer &&
                vehicle_res.message.original_purchasing_dealer !== frm.doc.dealer
            ) {
                frappe.msgprint("Vehicle was not purchased by the selected dealership on this claim.");
                frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
                return; // stop further checks
            }
        } catch (e) {
            console.error("Dealer validation failed:", e);
        }

        // Step 3: Existing duplicate check (your original logic)
        frappe.db.get_doc("Dealer Claim Category", frm.doc.claim_category).then((res) => {
            res.claim_types.forEach(function (r) {
                if (r.claim_type_code === frm.doc.claim_type_code && !r.allow_duplicate_claim) {
                    frappe.call({
                        method: "edp_online_vehicles.edp_online_vehicles.doctype.dealer_claims.dealer_claims.dealer",
                        args: {
							doc: frm.doc, // optional
							vinno: row.vin_serial_no,
							dealer: frm.doc.dealer,
							claim_type_code: frm.doc.claim_type_code,
                        },
                        callback: function (r) {
                            if (r.message && r.message.length > 0) {
                                frappe.msgprint("You cannot load the same claim for this vehicle more than once.");
                                frappe.model.set_value(cdt, cdn, "vin_serial_no", null);
                            }
                        },
                    });
                }
            });
        });

        frm.refresh_field("table_exgk");
    },
});

