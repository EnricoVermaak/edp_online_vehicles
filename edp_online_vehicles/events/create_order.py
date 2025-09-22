import json

import frappe


@frappe.whitelist()
def create_dealer_to_dealer_order(
	items, ordering_dealer, requested_delivery_date, order_date_time, order_no, dealer_order_no
):
	items = json.loads(items)
	created_items = []

	user_id = frappe.session.user
	full_name = frappe.db.get_value("User", user_id, "full_name")

	for item in items:
		deal_doc = frappe.new_doc("Vehicles Dealer to Dealer Order")

		deal_doc.order_no = order_no
		deal_doc.order_placed_by = ordering_dealer
		deal_doc.name_of_ordering_user = full_name
		deal_doc.order_placed_to = item.get("dealer")
		deal_doc.order_date_time = order_date_time
		deal_doc.requested_delivery_date = requested_delivery_date
		deal_doc.dealer_order_no = dealer_order_no

		deal_doc.model = item.get("model")
		deal_doc.colour = item.get("colour")
		deal_doc.purpose = item.get("purpose")
		deal_doc.description = item.get("description")
		deal_doc.row_id = item.get("row_id")

		# Insert the document into the database
		deal_doc.insert(ignore_permissions=True, ignore_mandatory=True)

		# Add the item's ID to the created_items list
		created_items.append({"id": item.get("id")})

	if created_items:
		return


@frappe.whitelist()
def create_hq_order(
	items,
	docs,
	ordering_dealer,
	requested_delivery_date,
	order_date_time,
	order_no,
	dealer_order_no,
	finance_option,
	floorplan=None,
):
	items = json.loads(items)
	docs = json.loads(docs)
	created_items = []

	user_id = frappe.session.user
	full_name = frappe.db.get_value("User", user_id, "full_name")

	for item in items:
		hq_doc = frappe.new_doc("Head Office Vehicle Orders")

		# hq_doc.name = f'test'
		# hq_doc.name = f'{order_no}-{item.get("index")}'

		hq_doc.order_no = order_no
		hq_doc.order_placed_by = ordering_dealer
		hq_doc.name_of_ordering_user = full_name
		hq_doc.order_placed_to = item.get("dealer")
		hq_doc.order_datetime = order_date_time
		hq_doc.requested_delivery_date = requested_delivery_date
		hq_doc.dealer_order_no = dealer_order_no
		hq_doc.finance_option = finance_option
		hq_doc.payment_terms = item.get("default_payment")

		status = frappe.get_value("Vehicles Order Status", {"default": 1}, "status")
		hq_doc.status = status

		dealer_billing = frappe.get_value(
			"Model Administration", {"model_code": item.get("model")}, "dealer_billing_excl"
		)
		hq_doc.dealer_billing = dealer_billing

		if floorplan:
			hq_doc.floorplan = floorplan

		hq_doc.model = item.get("model")
		hq_doc.colour = item.get("colour").split(" - ")[0]
		hq_doc.price_excl = item.get("price_excl")
		hq_doc.purpose = item.get("purpose")
		hq_doc.description = item.get("description")
		hq_doc.row_id = item.get("row_id")
		hq_doc.order_type = item.get("order_type")

		for doc in docs:
			hq_doc.append(
				"documents", {"document": doc.get("document"), "document_name": doc.get("document_name")}
			)

		# Insert the document into the database

		hq_doc.insert(ignore_permissions=True)

		# frappe.msgprint(f'{order_no}-{item.get("index")}')

		# hq_doc.name = f'{order_no}-{item.get("index")}'

		# hq_doc.save()

		# Add the item's ID to the created_items list
		created_items.append({"id": item.get("id")})

	if created_items:
		return
