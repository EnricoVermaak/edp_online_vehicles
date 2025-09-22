# Copyright (c) 2024, Tecwise and contributors
# For license information, please see license.txt

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, nowdate
from frappe.utils.data import get_link_to_form


class VehiclesShipment(Document):
	def validate(self):
		for row in self.vehicles_shipment_items:
			if row.reserve_to_order:
				order = frappe.db.get_doc("Head Office Vehicle Orders", row.reserve_to_order)

				if order:
					order.shipment_stock = row.vin_serial_no
					order.shipment_no = self.shipment_file_no
					order.shipment_target_warehouse = row.target_warehouse
					order.save(ignore_permissions=True)

		if not self.eta_warehouse:
			sla_days = frappe.db.get_single_value("Vehicle Stock Settings", "sla_days") or 0

			if sla_days > 0:
				base_date = self.eta_harbour or nowdate()

				self.eta_harbour = add_days(base_date, sla_days)

	@frappe.whitelist()
	def create_stock_entry(self, selected_items):
		selected_items = json.loads(selected_items)
		self.create_or_update_items(selected_items)
		stock_entry = self.create_stock_entry_for_serial_numbers(selected_items)
		eq_stock = self.create_vehicles_stock_entries(selected_items)
		eq_card = self.create_vehicles_card(selected_items)
		order_update = self.check_head_office_orders(selected_items)
		frappe.db.commit()
		if (
			stock_entry == "Received"
			and eq_stock == "Received"
			and eq_card == "Received"
			and order_update == "Received"
		):
			return "Received"

	def create_or_update_items(self, selected_items):
		for item in selected_items:
			item_name = frappe.utils.get_link_to_form("Model Administration", item.get("model_code"))
			if not frappe.db.exists("Item", item.get("model_code")):
				frappe.throw(f"{item_name} Item not Exist")

	def create_stock_entry_for_serial_numbers(self, selected_items):
		stock_entry = frappe.get_doc(
			{"doctype": "Stock Entry", "stock_entry_type": "Material Receipt", "items": []}
		)

		for item in selected_items:
			if not item.get("vin_serial_no"):
				frappe.throw(_("Serial No is missing for item"))

			if not item.get("target_warehouse"):
				frappe.throw(_("Target warehouse is missing for item"))

			if not item.get("model_code"):
				frappe.throw(_("Model code is missing for an item."))

			stock_entry.append(
				"items",
				{
					"item_code": item.get("model_code"),
					"qty": 1,
					"basic_rate": item.get("cost_price_excl"),
					"serial_no": item.get("vin_serial_no"),
					"t_warehouse": item.get("target_warehouse"),
				},
			)
		stock_entry.save(ignore_permissions=True)
		stock_entry.submit()
		return "Received"

	def create_vehicles_stock_entries(self, selected_items):
		for item in selected_items:
			if frappe.db.exists("Vehicle Stock", {"vin_serial_no": item.get("vin_serial_no")}):
				frappe.throw(
					f"This unit was already received into stock and cannot be processed again: {item.get('vin_serial_no')}"
				)

			model_doc = frappe.get_doc("Model Administration", item.get("model_code"))

			if model_doc.automatically_reserve_model:
				new_vehicles_stock = frappe.get_doc(
					{
						"doctype": "Vehicle Stock",
						"vin_serial_no": item.get("vin_serial_no"),
						"engine_no": item.get("engine_no"),
						"colour": item.get("colour"),
						"model": item.get("model_code"),
						"stock_no": item.get("stock_no"),
						"description": item.get("model_description"),
						"cost_price_excl": item.get("cost_price_excl"),
						"dealer": self.dealer,
						"target_warehouse": item.get("target_warehouse"),
						"vessel_name": self.vessel_name,
						"eta_warehouse": self.eta_warehouse,
						"eta_harbour": self.eta_harbour,
						"type": "New",
						"shipment_id": self.name,
						"catagory": model_doc.category,
						"shipment_file_no": self.shipment_file_no,
						"availability_status": "Reserved",
					}
				)

				new_doc = frappe.new_doc("Reserved Vehicles")

				new_doc.vin_serial_no = item.get("vin_serial_no")
				new_doc.dealer = self.dealer
				new_doc.status = "Reserved"
				new_doc.reserve_reason = "Model set to automatically reserve"
				new_doc.reserve_from_date = nowdate()

				new_doc.insert(ignore_permissions=True)
			else:
				new_vehicles_stock = frappe.get_doc(
					{
						"doctype": "Vehicle Stock",
						"vin_serial_no": item.get("vin_serial_no"),
						"engine_no": item.get("engine_no"),
						"colour": item.get("colour"),
						"model": item.get("model_code"),
						"stock_no": item.get("stock_no"),
						"description": item.get("model_description"),
						"cost_price_excl": item.get("cost_price_excl"),
						"dealer": self.dealer,
						"target_warehouse": item.get("target_warehouse"),
						"vessel_name": self.vessel_name,
						"eta_warehouse": self.eta_warehouse,
						"eta_harbour": self.eta_harbour,
						"type": "New",
						"shipment_id": self.name,
						"catagory": model_doc.category,
						"shipment_file_no": self.shipment_file_no,
						"availability_status": "Available",
					}
				)

			new_vehicles_stock.insert(ignore_permissions=True)

			ship_doc_link = get_link_to_form("Vehicles Shipment", self.name)

			comment = f"""
			Vehicle has been received from shipment {ship_doc_link} with the following details:
			<br>
			<br>
			- VIN/Serial No: {item.get("vin_serial_no")}<br>
			- Model: {item.get("model_code")}<br>
			- Supplier: {self.supplier}<br>
			- Shipment File No: {self.shipment_file_no}<br>
			- Target Warehouse: {self.target_warehouse}"""

			doc = frappe.get_doc("Vehicle Stock", item.get("vin_serial_no"))

			doc.add_comment("Comment", comment)

			formatted_colour = item.get("colour").split(" - ")[0]

			hq_order_docs = frappe.db.get_all(
				"Head Office Vehicle Orders",
				filters={"model": item.get("model_code"), "colour": formatted_colour, "vinserial_no": ""},
				fields=["name"],
			)

			for doc in hq_order_docs:
				hq_doc = frappe.get_doc("Head Office Vehicle Orders", doc.name)

				# Fetch existing tags
				existing_tags = hq_doc.get_tags()

				# Add the 'Stock Available' tag if it doesn't already exist
				if "Stock Available" not in existing_tags:
					hq_doc.add_tag("Stock Available")
					hq_doc.save(ignore_permissions=True)
					frappe.db.commit()

		return "Received"

	def create_vehicles_card(self, selected_items):
		return "Received"

	# def check_head_office_orders(self, selected_items):
	# 	auto_allocate_to_shipments = frappe.db.get_single_value('Vehicle Stock Settings', 'automatically_allocate_received_shipments')

	# 	if auto_allocate_to_shipments:
	# 		for item in selected_items:
	# 			vin_serial_no = item.get("vin_serial_no")
	# 			if not vin_serial_no:
	# 				continue

	# 			# Query for the oldest Head Office Vehicle Order (Back Order) with an empty vinserial_no
	# 			matching_orders = frappe.get_all(
	# 				'Head Office Vehicle Orders',
	# 				filters={
	# 					'order_type': "Back Order",
	# 					'model': item.get("model_code"),
	# 					'vinserial_no': ''
	# 				},
	# 				fields=["name"],
	# 				order_by="creation asc",
	# 				limit=1
	# 			)
	# 			if matching_orders:
	# 				order_name = matching_orders[0]["name"]
	# 				# Update the matching Head Office Vehicle Order with the provided VIN number
	# 				frappe.db.set_value('Head Office Vehicle Orders', order_name, {
	# 					'vinserial_no': vin_serial_no,
	# 					'shipment_stock': None
	# 				})

	# 		return "Received"
	# 	else:
	# 		for item in selected_items:
	# 			vin_serial_no = item.get("vin_serial_no")

	# 			if not vin_serial_no:
	# 				continue

	# 			if not item.get("reserve_to_order"):
	# 				continue

	# 			# Query Head Office Vehicle Orders for a matching shipment_stock
	# 			matching_order = frappe.db.get_value(
	# 				'Head Office Vehicle Orders',
	# 				{'shipment_stock': vin_serial_no},
	# 				['name', 'shipment_stock']
	# 			)

	# 			if matching_order:
	# 				order_name = matching_order[0]

	# 				# Update the matching Head Office Vehicle Order
	# 				frappe.db.set_value('Head Office Vehicle Orders', order_name, {
	# 					'vinserial_no': vin_serial_no,
	# 					'shipment_stock': None
	# 				})

	# 		return "Received"

	def check_head_office_orders(self, selected_items):
		auto_allocate_to_shipment_purposes = frappe.db.get_value(
			"Vehicles Order Purpose", {"automatically_allocate_received_shipments": 1}, "name"
		)

		if auto_allocate_to_shipment_purposes:
			for item in selected_items:
				vin_serial_no = item.get("vin_serial_no")
				model = item.get("model_code")
				description = item.get("model_description")
				colour = item.get("colour")
				engine_no = item.get("engine_no")

				formatted_colour = colour.split(" - ")[0]

				if not vin_serial_no:
					continue

				# Query for the oldest Head Office Vehicle Order (Back Order) with an empty vinserial_no
				matching_orders = frappe.get_all(
					"Head Office Vehicle Orders",
					filters={
						"order_type": "Back Order",
						"model": model,
						"vinserial_no": "",
						"colour": formatted_colour,
						"status": "Pending",
						"purpose": ["in", auto_allocate_to_shipment_purposes],
					},
					fields=["name"],
					order_by="creation asc",
					limit=1,
				)

				if matching_orders:
					order_name = matching_orders[0]["name"]

					# Update the matching Head Office Vehicle Order with the provided VIN number
					hq_order_doc = frappe.get_doc("Head Office Vehicle Orders", order_name)

					if hq_order_doc:
						hq_order_doc.vinserial_no = vin_serial_no
						hq_order_doc.model_delivered = model
						hq_order_doc.model_description = description
						hq_order_doc.colour_delivered = formatted_colour
						hq_order_doc.engine_no = engine_no
						hq_order_doc.status = "Processed"

						hq_order_doc.save(ignore_permissions=True)

			return "Received"
		else:
			for item in selected_items:
				vin_serial_no = item.get("vin_serial_no")

				if not vin_serial_no:
					continue

				if not item.get("reserve_to_order"):
					continue

				# Query Head Office Vehicle Orders for a matching shipment_stock
				matching_order = frappe.db.get_value(
					"Head Office Vehicle Orders",
					{"shipment_stock": vin_serial_no},
					["name", "shipment_stock"],
				)

				if matching_order:
					order_name = matching_order[0]

					# Update the matching Head Office Vehicle Order
					frappe.db.set_value(
						"Head Office Vehicle Orders",
						order_name,
						{"vinserial_no": vin_serial_no, "shipment_stock": None},
					)

			return "Received"
