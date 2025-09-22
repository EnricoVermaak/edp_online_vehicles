import frappe


@frappe.whitelist()
def contract_expired():
	equip_doc = frappe.get_all("Vehicle Stock", filters={"contract_end_date": "2024-10-30"})

	equip_doc.status = "Expired"
	equip_doc.save()
	frappe.db.commit()
