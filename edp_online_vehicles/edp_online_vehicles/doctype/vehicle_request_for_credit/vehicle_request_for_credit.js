// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Request For Credit", {
	refresh(frm) {
		frm.set_query("order_no", () => {
			return {
				filters: {
					vinserial_no: ["!=", ""],
					status: ["!=", "Cancelled"],
				},
			};
		});
	},
});
