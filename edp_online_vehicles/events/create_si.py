import json

import frappe


def create_si_from_delivery_trip(doc, method=None):
	rows_to_update = []

	for row in doc.delivery_stops:
		if not frappe.db.exists("Sales Invoice", {"name": row.custom_inv_no}):
			new_doc = frappe.new_doc("Sales Invoice")
			if row.custom_inv_no:
				new_doc.custom_custom_id = row.custom_inv_no
			new_doc.customer = row.customer

			if row.custom_dropshipment_customer:
				new_doc.custom_dropshipment_customer = row.custom_dropshipment_customer

			new_doc.territory = row.custom_territory
			new_doc.custom_parent_territory = row.custom_parent_territory
			new_doc.custom_delivery_status = row.custom_delivery_status
			new_doc.custom_comments = row.details
			new_doc.address_display = row.customer_address
			new_doc.append(
				"items",
				{"item_code": "CCL002", "qty": row.custom_inv_qty, "custom_weight": row.custom_weight},
			)
			new_doc.save()

			if row.custom_dropshipment_customer:
				rows_to_update.append(
					{
						"old_row": row,
						"new_inv_name": new_doc.name,
						"new_customer": new_doc.customer,
						"new_customer_name": new_doc.customer_name,
						"new_inv_qty": new_doc.items[0].qty,
						"new_address": new_doc.customer_address,
						"new_address_display": new_doc.address_display,
						"new_territory": new_doc.territory,
						"new_parent_territory": new_doc.custom_parent_territory,
						"new_weight": new_doc.items[0].custom_weight,
						"new_delivery_status": new_doc.custom_delivery_status,
						"new_details": new_doc.custom_comments,
						"new_dropship_customer": new_doc.custom_dropshipment_customer,
						"new_dropship_cust_name": new_doc.custom_dropshipment_customer_name,
					}
				)
			else:
				rows_to_update.append(
					{
						"old_row": row,
						"new_inv_name": new_doc.name,
						"new_customer": new_doc.customer,
						"new_customer_name": new_doc.customer_name,
						"new_inv_qty": new_doc.items[0].qty,
						"new_address": new_doc.customer_address,
						"new_address_display": new_doc.address_display,
						"new_territory": new_doc.territory,
						"new_parent_territory": new_doc.custom_parent_territory,
						"new_weight": new_doc.items[0].custom_weight,
						"new_delivery_status": new_doc.custom_delivery_status,
						"new_details": new_doc.custom_comments,
					}
				)
		elif frappe.db.exists("Sales Invoice", {"name": row.custom_inv_no}):
			inv_doc = frappe.get_doc("Sales Invoice", row.custom_inv_no)

			if row.customer != inv_doc.customer:
				inv_doc.customer = row.customer
				inv_doc.save(ignore_permissions=True)

	# Loop through rows_to_update and append data back to delivery_stops
	for update in rows_to_update:
		if "new_dropship_customer" in update:
			doc.delivery_stops.remove(update["old_row"])
			doc.append(
				"delivery_stops",
				{
					"custom_inv_no": update["new_inv_name"],
					"customer": update["new_customer"],
					"custom_customer_name": update["new_customer_name"],
					"custom_inv_qty": update["new_inv_qty"],
					"address": update["new_address"],
					"customer_address": update["new_address_display"],
					"custom_territory": update["new_territory"],
					"custom_parent_territory": update["new_parent_territory"],
					"custom_weight": update["new_weight"],
					"custom_delivery_status": update["new_delivery_status"],
					"details": update["new_details"],
					"custom_dropshipment_customer": update["new_dropship_customer"],
					"custom_dropshipment_customer_name": update["new_dropship_cust_name"],
				},
			)
		else:
			doc.delivery_stops.remove(update["old_row"])
			doc.append(
				"delivery_stops",
				{
					"custom_inv_no": update["new_inv_name"],
					"customer": update["new_customer"],
					"custom_customer_name": update["new_customer_name"],
					"custom_inv_qty": update["new_inv_qty"],
					"address": update["new_address"],
					"customer_address": update["new_address_display"],
					"custom_territory": update["new_territory"],
					"custom_parent_territory": update["new_parent_territory"],
					"custom_weight": update["new_weight"],
					"custom_delivery_status": update["new_delivery_status"],
					"details": update["new_details"],
				},
			)

	# Update Sales Invoice and Customer territory fields if necessary
	for row in doc.delivery_stops:
		if row.custom_territory:
			si_doc = frappe.get_doc("Sales Invoice", row.custom_inv_no)
			cus_doc = frappe.get_doc("Customer", row.customer)
			si_doc.db_set("territory", row.custom_territory)
			si_doc.db_set("custom_parent_territory", row.custom_parent_territory)
			cus_doc.db_set("territory", row.custom_territory)

	# Reindex delivery_stops
	if doc.get("delivery_stops"):
		for idx, row in enumerate(doc.delivery_stops, start=1):
			row.idx = idx

	frappe.db.commit()


def sales_invoice_name(doc, method=None):
	if doc.custom_custom_id:
		doc.name = doc.custom_custom_id


@frappe.whitelist()
def change_sales_status(trip_doc, cds=None):
	if cds:
		make_delivery_note(trip_doc)

	data = json.loads(trip_doc)
	if data["custom_customer_delivery_status"] == "Delivery Failed":
		for row in data["custom_customer_delivery_list"]:
			si_doc = frappe.get_doc("Sales Invoice", row["inv_no"])
			si_doc.db_set("custom_delivery_trip_", "")
			si_doc.db_set("custom_delivery_trip_assign", "No")
	if data["custom_customer_delivery_status"] == "Completed":
		for row in data["custom_customer_delivery_list"]:
			si_doc = frappe.get_doc("Sales Invoice", row["inv_no"])
			si_doc.db_set("custom_delivery_trip_assign", "Yes")
			si_doc.db_set("custom_delivery_trip_", data["name"])
	frappe.db.commit()


@frappe.whitelist()
def make_delivery_note(trip_doc):
	data = json.loads(trip_doc)
	doc = frappe.new_doc("Delivery Note")
	doc.custom_received_by = data["custom_received_by"]
	doc.custom_delivery_trip = data["name"]
	doc.custom_received_by_signature = data["custom_received_by_signature_"]
	doc.customer = data["custom_customer"]

	if data.get("custom_dropshipment_customer"):
		doc.custom_dropshipment_customer = data.get("custom_dropshipment_customer")

	doc.custom_delivery_date = data["custom_delivery_date"]

	if data.get("custom_delivery_remarks"):
		doc.custom_delivery_remarks = data["custom_delivery_remarks"]

	if data.get("custom_image_1"):
		doc.custom_image_1 = data["custom_image_1"]

	if data.get("custom_image_2"):
		doc.custom_image_2 = data["custom_image_2"]

	if data.get("custom_image_3"):
		doc.custom_image_3 = data["custom_image_3"]

	# Fetch customer document
	customer_doc = frappe.get_doc("Customer", "CCLVD")
	if customer_doc and customer_doc.primary_address:
		doc.dispatch_address = customer_doc.primary_address

	total_delivered = 0
	total_returned = 0

	for row in data["custom_customer_delivery_list"]:
		si = frappe.get_doc("Sales Invoice", row["inv_no"])
		doc.set_warehouse = si.set_warehouse

		for item in si.items:
			delivered_qty = row.get("delivered", 0)

			# Always gather the data regardless of delivered_qty
			item_row = {
				"item_code": item.item_code,
				"custom_qty_returned": row.get("return", 0),
				"qty": 1,
				"custom_qty_delivered": delivered_qty,
				"custom_weight": row.get("custom_weight"),
				"rate": item.rate,
				"amount": item.amount,
				"uom": item.uom,
				"against_sales_invoice": si.name,
				"si_detail": item.name,
				"custom_details": row.get("custom_details", ""),
			}

			# Append item_row to items in the Delivery Note
			doc.append("items", item_row)

			# Update totals
			total_delivered += delivered_qty
			total_returned += row.get("return", 0)

	# Set totals for delivered and returned quantities
	doc.custom_total_quantity_delivered = total_delivered
	doc.custom_total_quantity_returned = total_returned

	# Insert and submit the document
	doc.insert(ignore_permissions=True)
	doc.submit()
	frappe.db.commit()
