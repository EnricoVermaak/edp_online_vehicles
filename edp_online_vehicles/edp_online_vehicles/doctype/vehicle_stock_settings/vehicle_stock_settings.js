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
	// fleet_customer_prefix: function(frm) {
	//     last_fleet_no = frm.doc.fleet_customer_prefix + '000000'

	//         prefix = frm.doc.fleet_customer_prefix

	//         frappe.call({
	//             method: "frappe.client.get_list",
	//             args: {
	//                 doctype: "Fleet Customer", // Replace with your Doctype name
	//                 filters: [
	//                     ["fleet_code", "like", prefix] // Fetch only records starting with MSH
	//                 ],
	//                 fields: ["fleet_code"],      // Fetch only the fleet_code field
	//                 limit_page_length: 1000      // Adjust as needed
	//             },
	//             callback: function(response) {
	//                 if (response.message) {
	//                     // Filter only valid fleet codes that match "MSH" followed by exactly 5 digits
	//                     let validFleetCodes = response.message
	//                         .map(record => record.fleet_code)
	//                         .filter(code => /^MSH\d{5}$/.test(code)); // Match MSH followed by 5 digits

	//                     // Extract numeric part and find the max value
	//                     let maxFleetCode = validFleetCodes.reduce((max, code) => {
	//                         let numericPart = parseInt(code.match(/\d+/)[0]); // Extract numeric part
	//                         return numericPart > max ? numericPart : max;
	//                     }, 0);

	//                     // console.log("Highest fleet code:", "MSH" + String(maxFleetCode).padStart(5, '0'));
	//                 }
	//             }
	//         });

	//     frm.doc.last_fleet_no = maxFleetCode;

	//     frm.fields_dict.last_fleet_no.refresh();
	// }
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
