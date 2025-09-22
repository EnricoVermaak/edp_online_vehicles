frappe.ui.form.on("Sales Invoice", {
	on_submit(frm) {
		// Check the "allow_stock_allocation_on_invoice" setting
		frappe.db
			.get_single_value(
				"Vehicles Stock Settings",
				"allow_stock_allocation_on_invoice",
			)
			.then((invoiced) => {
				if (invoiced) {
					check_if_document_exists(frm.doc.name).then((exists) => {
						if (exists) {
							run_stock_allocation(frm);
						} else {
							wait_for_document_creation(frm);
						}
					});
				}
				// else {
				//     // Check the "allow_stock_allocation_on_invoice_paid" setting
				//     frappe.db.get_single_value('Equipment Stock Settings', 'allow_stock_allocation_on_invoice_paid')
				//     .then(invoice_paid => {
				//         if (invoice_paid) {
				//             if (frm.doc.outstanding_amount == 0) {
				//                 check_if_document_exists(frm.doc.name).then((exists) => {
				//                     if (exists) {
				//                         run_stock_allocation(frm);
				//                     } else {
				//                         wait_for_document_creation(frm);
				//                     }
				//                 });
				//             }
				//         }
				//     });
				// }
			});
	},
	onload(frm) {
		frm.set_query("custom_vinserial_no", "items", () => {
			return {
				filters: {
					availability_status: "Available",
				},
			};
		});
	},
});

// Function to check if the document exists in the database
function check_if_document_exists(docname) {
	return frappe.db.exists("Sales Invoice", docname);
}

// Function to wait for document creation
function wait_for_document_creation(frm) {
	let interval = setInterval(() => {
		check_if_document_exists(frm.doc.name).then((exists) => {
			if (exists) {
				// Document has been created, run the logic
				clearInterval(interval);
				run_stock_allocation(frm);
			}
		});
	}, 1000);
}

// Function to run the stock allocation logic
function run_stock_allocation(frm) {
	frappe.call({
		method: "edp_online_vehicles.events.move_stock_on_invoice.move_stock_on_invoice",
		args: {
			docname: frm.doc.name,
		},
	});
}
