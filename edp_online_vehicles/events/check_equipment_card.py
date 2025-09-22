import frappe


@frappe.whitelist()
def check_linked_vinnos(vinno):
	if frappe.db.exists("Vehicles Card", {"vin_serial_no": vinno}):
		return frappe.get_doc("Vehicle Stock", vinno)
