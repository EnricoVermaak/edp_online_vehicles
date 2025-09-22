import frappe


@frappe.whitelist()
def check_stock_availability(vinno):
	if vinno:
		# Logic to check stock availability
		stock_available = frappe.db.exists(
			"Vehicle Stock", {"vin_serial_no": vinno, "availability_status": "Available"}
		)
		if not stock_available:
			return "Not Available"
