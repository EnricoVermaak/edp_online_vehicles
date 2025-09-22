// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

let previous_status_value = null;

frappe.ui.form.on("Vehicles Breakdown", {
	onload(frm) {
		// Reset the field to its previous status if no new value is selected
		$(document).on("blur", '[data-fieldname="status"]', function () {
			// Check if the value is empty (or remains unchanged)
			if (!frm.doc.status || frm.doc.status === "") {
				frm.set_value("status", previous_status_value);
			}
		});

		// $(document).on('click', '[data-fieldname="status"]', function() {
		//     frm.set_value('status', '');
		// });

		previous_status_value = frm.doc.status;
	},
});
