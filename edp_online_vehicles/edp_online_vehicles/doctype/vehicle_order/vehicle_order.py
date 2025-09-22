# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import json

import frappe
from edp_online_vehicles.events.create_order import create_dealer_to_dealer_order, create_hq_order
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import getdate, now_datetime


class VehicleOrder(Document):
	def before_submit(self):
		self.order_date_time = now_datetime()

	def on_submit(self):
		"""Processes HQ and Dealer to Dealer orders based on the given order document."""
		items = []
		dealer_items = []
		docs = []
		index = 0

		# Collect items for HQ orders
		for row in self.get("vehicles_basket", []):
			if (
				not row.get("order_document_created")
				and row.get("order_from") in ["Warehouse", "Back Order"]
				and row.get("dealer")
			):
				index += 1
				items.append(
					{
						"id": row.get("name"),
						"model": row.get("model"),
						"colour": row.get("colour"),
						"purpose": row.get("purpose"),
						"price_excl": row.get("price_excl"),
						"dealer": row.get("dealer"),
						"description": row.get("description"),
						"row_id": row.get("idx"),
						"order_type": row.get("order_from"),
						"default_payment": row.get("default_payment"),
						"index": index,
					}
				)

		# Collect mandatory documents
		for doc in self.get("mandatory_documents", []):
			docs.append({"document": doc.get("document"), "document_name": doc.get("document_name")})

		# Process HQ Orders
		if items:
			items = json.dumps(items)
			docs = json.dumps(docs)
			ordering_dealer = self.dealer
			dealer_order_no = self.dealer_order_no
			order_date_time = self.order_date_time
			requested_delivery_date = self.requested_delivery_date
			order_no = self.name
			finance_option = self.finance_option
			floorplan = self.floorplan or ""

			create_hq_order(
				items,
				docs,
				ordering_dealer,
				requested_delivery_date,
				order_date_time,
				order_no,
				dealer_order_no,
				finance_option,
				floorplan,
			)

		# Collect items for Dealer Orders
		for row in self.get("vehicles_basket", []):
			if (
				not row.get("order_document_created")
				and row.get("order_from") == "Dealer"
				and row.get("dealer")
			):
				dealer_items.append(
					{
						"id": row.get("name"),
						"model": row.get("model"),
						"colour": row.get("colour"),
						"purpose": row.get("purpose"),
						"dealer": row.get("dealer"),
						"description": row.get("description"),
						"row_id": row.get("idx"),
					}
				)

		# Process Dealer to Dealer Orders
		if dealer_items:
			items = json.dumps(dealer_items)
			ordering_dealer = self.dealer
			dealer_order_no = self.dealer_order_no
			order_date_time = self.order_date_time
			requested_delivery_date = self.requested_delivery_date
			order_no = self.name

			create_dealer_to_dealer_order(
				items, ordering_dealer, requested_delivery_date, order_date_time, order_no, dealer_order_no
			)

		frappe.msgprint("Orders created")

	def autoname(self):
		prefix = frappe.get_single("Vehicle Stock Settings").vehicle_order_no_prefix

		date = getdate().strftime("%m%y")

		vehicle_count = 0

		for _row in self.vehicles_basket:
			vehicle_count += 1

		if prefix:
			self.name = make_autoname(f"{prefix}{date}.####")
		else:
			self.name = make_autoname(f"EO{date}.####")
