import json

import frappe


@frappe.whitelist()
def update_vehicles_details(items, convert_to_model):
	items = json.loads(items)

	for item in items:
		vinno = item.get("vin_serial_no")

		equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")

		if equip_doc:
			stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)

			stock_doc.model = convert_to_model
			stock_doc.save(ignore_permissions=True)

	frappe.db.commit()

	return "Vehicle Stock Details Updated"
