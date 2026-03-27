frappe.ui.form.on("eNaTIS Query", {
	refresh(frm) {
		frm.disable_save();
	},
	query_vehicle(frm) {
		const vin = (frm.doc.vin || "").trim();
		if (!vin) {
			frappe.msgprint(__("Please enter a VIN / Chassis No."));
			return;
		}

		const clear_fields = [
			"mv_reg_no", "mv_cert_no",
			"mv_model_n", "mv_state_cd", "mv_state_desc",
			"mv_main_colour", "mv_tare", "mv_engine_no",
			"mv_title_holder", "mv_owner",
			"error_code", "error_field", "error_description",
		];
		frm.set_value("status", "Pending");
		clear_fields.forEach((f) => frm.set_value(f, ""));
		frm.refresh_fields();

		frappe.call({
			method: "edp_api.api.enatis.enatis.query_vehicle",
			args: { vin },
			freeze: true,
			freeze_message: __("Querying eNaTIS..."),
			callback(r) {
				if (r.exc) {
					frm.set_value("status", "Failed");
					frm.set_value("queried_at", frappe.datetime.now_datetime());
					frm.refresh_fields();
					return;
				}
				const m = r.message;
				if (!m || typeof m !== "object") {
					frm.set_value("status", "Failed");
					frm.set_value("queried_at", frappe.datetime.now_datetime());
					frm.refresh_fields();
					return;
				}

				frm.set_value("queried_at", frappe.datetime.now_datetime());
				frm.set_value("status", m.success ? "Success" : "Failed");

				frm.set_value("mv_reg_no", m.mv_reg_no || "");
				frm.set_value("mv_cert_no", m.mv_cert_no || "");

				frm.set_value("mv_model_n", m.mv_model_n || "");
				frm.set_value("mv_state_cd", m.mv_state_cd || "");
				frm.set_value("mv_state_desc", m.mv_state_desc || "");
				frm.set_value("mv_main_colour", m.mv_main_colour || "");
				frm.set_value("mv_tare", m.mv_tare || "");
				frm.set_value("mv_engine_no", m.mv_engine_no || "");
				frm.set_value("mv_title_holder", m.mv_title_holder || "");
				frm.set_value("mv_owner", m.mv_owner || "");

				frm.set_value("error_code", m.error_code || "");
				frm.set_value("error_field", m.error_field || "");
				frm.set_value("error_description", m.error_description || "");
				frm.refresh_fields();

				if (m.success) {
					frappe.show_alert({
						message: __("Registration: {0}", [m.mv_reg_no || "N/A"]),
						indicator: "green",
					}, 10);
				} else {
					frappe.show_alert({
						message: __("eNaTIS Error: {0}", [m.error_description || m.error_code || "Unknown"]),
						indicator: "red",
					}, 10);
				}
			},
		});
	},
});
