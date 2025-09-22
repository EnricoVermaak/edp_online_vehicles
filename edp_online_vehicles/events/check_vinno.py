import frappe


@frappe.whitelist()
def check_service_vinno(vinno):
	if frappe.db.exists("Vehicle Stock", vinno):
		return True
	else:
		return False
