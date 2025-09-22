import frappe


@frappe.whitelist()
def get_recon_vehicles(dealer):
	vinnos = frappe.db.get_all(
		"Vehicle Stock",
		filters={"dealer": dealer, "availability_status": "Available"},
		fields=["vin_serial_no", "model", "description", "engine_no", "colour", "stock_no"],
	)

	return vinnos
