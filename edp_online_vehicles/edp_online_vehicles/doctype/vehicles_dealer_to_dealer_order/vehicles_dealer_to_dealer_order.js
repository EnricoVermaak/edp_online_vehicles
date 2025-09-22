// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;
let previous_vinno_value = null;
let previous_price = null;

frappe.ui.form.on("Vehicles Dealer to Dealer Order", {
	refresh(frm) {},
	onload(frm) {
		previous_status_value = frm.doc.status;
		previous_vinno_value = frm.doc.vin_serial_no;
		previous_price = frm.doc.price_excl;

		frm.set_query("vin_serial_no", () => {
			return {
				filters: {
					model: frm.doc.model,
					availability_status: "Available",
				},
			};
		});
	},
	after_save: function (frm) {
		if (frm.doc.status == "Delivered") {
			if (frm.doc.vin_serial_no) {
				frappe.call({
					method: "edp_online_vehicles.events.auto_move_stock.auto_move_stock_dealer",
					args: {
						vinno: frm.doc.vin_serial_no,
						company: frm.doc.order_placed_to,
						dealer: frm.doc.order_placed_by,
						model: frm.doc.model,
						rate: frm.doc.price_excl,
					},
					callback: function (r) {
						if (r.message) {
							frappe.call({
								method: "edp_online_vehicles.events.submit_document.submit_dealer_order_document",
								args: {
									doc: frm.doc.name,
								},
								callback: function (r) {
									if (r.message) {
										frappe.show_alert(
											{
												message: r.message,
											},
											5,
										);
									}
								},
							});
						}
					},
				});
			} else {
				frappe.msgprint(
					"Please enter a VIN or Serial Number to move the vehicle to the new dealer.",
				);
			}
		}

		if (frm.doc.status == "Approved") {
			if (frm.doc.vin_serial_no) {
				// Call the Python method to check for existing Dealer to Dealer Equipment Orders
				frappe.call({
					method: "edp_online_vehicles.events.auto_move_stock.check_dealer_to_dealer_orders_with_vin",
					args: {
						company: frm.doc.order_placed_to,
						vinno: frm.doc.vin_serial_no,
						current_docname: frm.doc.name,
					},
					callback: function (response) {
						if (response.message && response.message.length > 0) {
							// Prepare the dialog with the list of documents
							let vin = frm.doc.vin_serial_no;
							let message = `An order with VIN: ${vin} already exists. Would you like to proceed anyway?`;
							let documentsList = response.message
								.map((doc) => `<li>${doc}</li>`)
								.join("");
							let dialogHTML = `
                                <p>${message}</p>
                                <p>Documents with VIN: ${vin}</p>
                                <ul>${documentsList}</ul>
                            `;

							var dialog = new frappe.ui.Dialog({
								title: "Dealer to Dealer Vehicle Order Exists",
								fields: [
									{
										fieldtype: "HTML",
										label: "",
										fieldname: "info",
										options: dialogHTML,
									},
								],
								primary_action_label: "Confirm",
								primary_action: function () {
									// Proceed with updating the Sales Order if the user confirms
									frappe.call({
										method: "edp_online_vehicles.events.auto_move_stock.update_sales_order_dealer",
										args: {
											docname: frm.doc.name,
											vinno: frm.doc.vin_serial_no,
										},
										callback: function (updateResponse) {
											frappe.show_alert(
												{
													message:
														"Sales Order updated with new Vin/Serial No",
													indicator: "green",
												},
												5,
											);
											dialog.hide();
										},
									});
								},
								secondary_action_label: "Cancel",
								secondary_action: function () {
									frm.set_value("vin_serial_no", null);
									dialog.hide();
								},
							});
							dialog.show();
						} else {
							// If no existing documents are found, directly update the linked sales order
							frappe.call({
								method: "edp_online_vehicles.events.auto_move_stock.update_sales_order_dealer",
								args: {
									docname: frm.doc.name,
									vinno: frm.doc.vin_serial_no,
								},
								callback: function (updateResponse) {
									frappe.show_alert(
										{
											message:
												"Vin/Serial No added to Sales Order",
											indicator: "green",
										},
										5,
									);
								},
							});
						}
					},
				});
			}
		}

		if (
			frm.doc.status !== previous_status_value &&
			frm.doc.vin_serial_no !== previous_vinno_value &&
			frm.doc.price_excl !== previous_price
		) {
			frappe.call({
				method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_all",
				args: {
					order_doc: frm.doc.order_no,
					status: frm.doc.status,
					vinno: frm.doc.vin_serial_no,
					price: frm.doc.price_excl,
					row_id: frm.doc.row_id,
				},
			});
		} else if (
			frm.doc.status !== previous_status_value &&
			frm.doc.vin_serial_no !== previous_vinno_value
		) {
			frappe.call({
				method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_vinno_status",
				args: {
					order_doc: frm.doc.order_no,
					status: frm.doc.status,
					vinno: frm.doc.vin_serial_no,
					row_id: frm.doc.row_id,
				},
			});
		} else if (
			frm.doc.vin_serial_no !== previous_vinno_value &&
			frm.doc.price_excl !== previous_price
		) {
			console.log(previous_vinno_value);
			console.log(previous_price);

			frappe.call({
				method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price_vinno",
				args: {
					order_doc: frm.doc.order_no,
					vinno: frm.doc.vin_serial_no,
					price: frm.doc.price_excl,
					row_id: frm.doc.row_id,
				},
			});
		} else if (
			frm.doc.status !== previous_status_value &&
			frm.doc.price_excl !== previous_price
		) {
			console.log(previous_status_value);
			console.log(previous_price);

			frappe.call({
				method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price_status",
				args: {
					order_doc: frm.doc.order_no,
					status: frm.doc.status,
					price: frm.doc.price_excl,
					row_id: frm.doc.row_id,
				},
			});
		} else {
			if (frm.doc.status !== previous_status_value) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_status",
					args: {
						order_doc: frm.doc.order_no,
						status: frm.doc.status,
						row_id: frm.doc.row_id,
					},
				});
			}

			if (frm.doc.vin_serial_no !== previous_vinno_value) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_vinno",
					args: {
						order_doc: frm.doc.order_no,
						vinno: frm.doc.vin_serial_no,
						row_id: frm.doc.row_id,
					},
				});
			}

			if (frm.doc.price_excl !== previous_price) {
				frappe.call({
					method: "edp_online_vehicles.events.update_equip_order_status.update_equip_order_price",
					args: {
						order_doc: frm.doc.order_no,
						price: frm.doc.price_excl,
						row_id: frm.doc.row_id,
					},
				});
			}
		}

		if (frm.doc.vin_serial_no !== previous_vinno_value) {
			if (previous_vinno_value) {
				frm.call("remove_allocated_vinno", {
					previous_vinno_value,
				}).then((r) => {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							10,
						);
					}
				});
			}

			if (frm.doc.vin_serial_no) {
				frm.call("allocate_vinno").then((r) => {
					if (r.message) {
						frappe.show_alert(
							{
								message: r.message,
							},
							10,
						);
					}
				});
			}
		}

		if (frm.doc.status !== previous_status_value) {
			frappe.call({
				method: "edp_online_vehicles.events.status_tracking.status_tracking",
				args: {
					doc_id: frm.doc.name,
					status: frm.doc.claim_status,
					previous_status: previous_status_value,
					doctype: frm.doc.doctype,
				},
			});
		}

		previous_status_value = frm.doc.status;
		previous_vinno_value = frm.doc.vin_serial_no;
		previous_price = frm.doc.price_excl;
	},
});
