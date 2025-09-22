import json

import frappe


@frappe.whitelist()
def transfer(dt, selected_rows):
	dt = json.loads(dt)
	selected_rows = json.loads(selected_rows)
	doc = frappe.get_doc("Delivery Trip", dt["delivery_trip"])
	for row in selected_rows:
		# frappe.msgprint(f"{row}")
		doc.append(
			"delivery_stops",
			{
				"custom_inv_no": row["custom_inv_no"],
				"custom_customer_name": row["custom_customer_name"],
				"customer": row["customer"],
				"address": row["address"],
				"custom_inv_qty": row["custom_inv_qty"],
				"custom_checked_qty": row["custom_checked_qty"],
				"custom_delivered_qty": row["custom_delivered_qty"],
				"custom_return_": row["custom_return_"],
				"custom_weight": row["custom_weight"],
				"locked": row["locked"],
				"custom_delivery_status": row["custom_delivery_status"],
				"customer_address": row["customer_address"],
				"custom_territory": row["custom_territory"],
				"custom_parent_territory": row["custom_parent_territory"],
			},
		)

	doc.save()
	frappe.db.commit()
