import frappe


@frappe.whitelist()
def get_otp_items():
	otp_items = frappe.db.get_all(
		"Vehicle Deal Builder OTP Item Options", filters={"automatically_add_to_otp_items": 1}, pluck="name"
	)

	return otp_items
