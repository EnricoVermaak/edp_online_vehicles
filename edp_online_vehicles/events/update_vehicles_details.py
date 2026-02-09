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
			
			old_model = stock_doc.model
			
			stock_doc.model = convert_to_model
			stock_doc.save(ignore_permissions=True)
			
			if old_model and old_model != convert_to_model:
				_add_conversion_comment(equip_doc, old_model, convert_to_model)

	frappe.db.commit()

	return "Vehicle Stock Details Updated"


def _add_conversion_comment(vin, old_model, new_model):
	try:
		user = frappe.session.user
		
		comment_text = f"Model Conversion: {old_model} → {new_model} (Converted by: {user})"
		
		frappe.get_doc({
			"doctype": "Comment",
			"comment_type": "Info",
			"reference_doctype": "Vehicle Stock",
			"reference_name": vin,
			"content": comment_text,
			"comment_by": user
		}).insert(ignore_permissions=True)
		
		frappe.logger().info(f"Added conversion comment to Vehicle Stock {vin}: {old_model} → {new_model}")
	except Exception as e:
		frappe.logger().error(f"Failed to add conversion comment to Vehicle Stock {vin}: {str(e)}")

