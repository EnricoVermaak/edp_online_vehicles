// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

let previous_stock_no = "";
let vehicle_order_prefix = "";

frappe.ui.form.on("Vehicle Stock Settings", {
	refresh(frm) {
		$(frm.fields_dict["last_automated_stock_no"].input).on(
			"blur",
			function () {
				if (frm.doc.last_automated_stock_no) {
					if (frm.doc.last_automated_stock_no != previous_stock_no) {
						validate_last_stock_no(frm);
					}
				}
			},
		);
		vehicle_order_prefix = frm.doc.vehicle_order_no_prefix;
	},
	after_save(frm) {
		if (!vehicle_order_prefix === frm.doc.vehicle_order_no_prefix) {
			frappe.msgprint(__("test"));
		}
	},
	allow_stock_allocation_on_invoice(frm) {
		if (frm.doc.allow_stock_allocation_on_invoice_paid) {
			if (frm.doc.allow_stock_allocation_on_invoice) {
				frappe.msgprint(
					"If you wish to Automatically Allocate Stock on Invoice. Please uncheck Automatically Allocate Stock on Invoice Paid.",
				);

				frm.set_value("allow_stock_allocation_on_invoice", 0);
			}
		}
	},
	allow_stock_allocation_on_invoice_paid(frm) {
		if (frm.doc.allow_stock_allocation_on_invoice) {
			if (frm.doc.allow_stock_allocation_on_invoice_paid) {
				frappe.msgprint(
					"If you wish to Automatically Allocate Stock on Invoice Paid. Please uncheck Automatically Allocate Stock on Invoice.",
				);

				frm.set_value("allow_stock_allocation_on_invoice_paid", 0);
			}
		}
	},
	onload(frm) {
		previous_stock_no = frm.doc.last_automated_stock_no;
		console.log(previous_stock_no);
	},
	update_settings(frm) {
		frappe.call({
			method: "edp_online_vehicles.utils.settings.import_settings",
			freeze: true,
			freeze_message: "Updating Vehicle Stock Settings...",
			callback: function (r) {
				if (r.message) {
					frappe.msgprint(__("Vehicle Stock Settings Updated"));
				}
			},
		});
	}
});

function validate_last_stock_no(frm) {
	frappe.db
		.get_value(
			"Vehicle Stock",
			{ stock_no: frm.doc.last_automated_stock_no },
			["name"],
		)
		.then((r) => {
			if (r.message.name) {
				frappe.msgprint(
					"Cannot set Stock No to a Stock No that already exists",
				);
				frm.set_value("last_automated_stock_no", previous_stock_no);
			}
		});
}
