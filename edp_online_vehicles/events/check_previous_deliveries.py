import json

import frappe


@frappe.whitelist()
def check_previous_deliveries_qty_delivered(part_row, part_order_no, part_no):
	if isinstance(part_row, str):
		part_row = json.loads(part_row)

	# Initialize counters
	total_qty_ordered = 0
	total_qty_delivered = 0

	# Fetch all Parts Delivery Note documents with the given part_order_no
	delivery_notes = frappe.get_all(
		"Parts Delivery Note", filters={"part_order_no": part_order_no}, fields=["name"]
	)

	# Iterate through each delivery note
	for note in delivery_notes:
		# Fetch the delivery_note_item child table for each delivery note
		delivery_note = frappe.get_doc("Parts Delivery Note", note.name)
		for item in delivery_note.get("delivery_note_item"):
			if item.part_no == part_no:
				total_qty_delivered += item.qty_delivered

	# Add the qty_delivered from the current part_row to the total delivered quantity
	total_qty_delivered += part_row.get("qty_delivered", 0)
	total_qty_ordered = part_row.get("qty_ordered", 0)

	# Check if the total delivered quantity exceeds the ordered quantity
	if total_qty_delivered > total_qty_ordered:
		return False
	else:
		return True
