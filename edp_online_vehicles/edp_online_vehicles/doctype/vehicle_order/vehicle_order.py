# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import json

import frappe
from edp_online_vehicles.events.create_order import create_dealer_to_dealer_order, create_hq_order
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import getdate, now_datetime


class VehicleOrder(Document):
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
   
	def before_insert(self):
		if not self.dealer_order_no:
			self.dealer_order_no = generate_dealer_reference_number()
   
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


	@frappe.whitelist()
	def generate_dealer_reference_number(self):
		settings = frappe.get_single("Vehicle Stock Settings")
		if not settings.auto_generate_dealer_reference_number:
			return None
		prefix = settings.vehicle_order_no_prefix or "DRN"
		last_order = frappe.db.get_value(
			"Vehicle Order",
			{"dealer_order_no": ["like", f"{prefix}%"]},
			"dealer_order_no",
			order_by="dealer_order_no desc"
		)
		if last_order:
			seq_part = last_order.replace(prefix, "")
			next_seq = int(seq_part) + 1 if seq_part.isdigit() else 1
		else:
			next_seq = 1

		return f"{prefix}{str(next_seq).zfill(6)}"
	
	@frappe.whitelist()
	def get_row_stock_info(self, row):
		has_stock = self.row_has_stock(row)
		dealers = self.get_dealer_options(row, has_stock)
		if row.get("purpose"):
			automatically_set_to_back_order = frappe.db.get_value(
				"Vehicles Order Purpose",
				row.get("purpose"),
				"automatically_set_to_back_order",
			)

			if automatically_set_to_back_order:
				has_stock = False

		return{
			"has_stock" : has_stock,
			"dealers" : dealers	
		}

	@frappe.whitelist()
	def row_has_stock(self, row):
		hq_companies = frappe.get_all(
			"Company",
			filters={"custom_head_office": 1},
			pluck="name",
		)
		warehouses = frappe.get_all(
			"Warehouse",
			filters={
				"custom_visible_for_vehicles_orders": 1,
				"company": ["in",hq_companies]
			},
			pluck="name",
		)

		if not hq_companies or not warehouses or not row.get("model"):
			return False

		base_filters = {
			"dealer": ["in", hq_companies],
			"target_warehouse": ["in", warehouses],
			"model": row.get("model"),
			"availability_status": "Available",
		}

		# return base_filters

		count = frappe.db.count("Vehicle Stock", filters=base_filters)

		colour = row.get("colour")
		colour_count = 0

		if colour:
			colour_filters = base_filters.copy()
			colour_filters["colour"] = colour
			colour_count = frappe.db.count("Vehicle Stock", filters=colour_filters)

		# return {
		# 	"count": count,
		# 	"colour_count": colour_count
		# }
		count = 0
		for unit in self.vehicles_basket:
			# return unit
			count+=1

			
			if unit.model != row.get("model"):
				continue

			if getattr(unit, "order_from", None) != "Warehouse":
				continue

			if colour:
				
				if unit.colour == colour:
					# if count == 2:
					# return {
					# 		"unit.colour": unit.colour,
					# 		"colour": colour,
					# 		"colour_count": colour_count
					# 	}

					colour_count -= 1
				else:
					count -= 1
			else:
				count -= 1

		if colour:
			return colour_count >= 0

		return count >= 0



	def get_dealer_options(self, row, has_stock):
		warehouse_companies = []

		hq_companies = frappe.get_all(
			"Company",
			filters={"custom_head_office": 1},
			pluck="name",
		)

		if not has_stock:

			allow_dealer_to_dealer_orders = frappe.db.get_single_value(
				"Vehicle Stock Settings",
				"allow_dealer_to_dealer_orders",
			)

			if allow_dealer_to_dealer_orders:

				warehouses = sorted(set(frappe.get_all(
					"Warehouse",
					filters={"custom_visible_for_vehicles_orders": 1,"company":["not in",hq_companies]},
					pluck="name",
				)))		

				base_filters = {
					"target_warehouse": ["in", warehouses],
					"model": row.get("model"),
					"availability_status": "Available",
				}

				warehouse_companies = frappe.db.get_all(
					"Vehicle Stock",
					filters=base_filters,
					pluck="dealer"
				)

				warehouse_companies = sorted(set(warehouse_companies))

		companies = list(dict.fromkeys(hq_companies + warehouse_companies))

		return companies

