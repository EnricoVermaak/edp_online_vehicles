# Copyright (c) 2024, Tecwise and contributors
# For license information, please see license.txt

import json
import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, nowdate, today
from frappe.utils.data import get_link_to_form

from edp_online_vehicles.edp_online_vehicles.doctype.head_office_vehicle_orders.head_office_vehicle_orders import (
	_fire_on_vehicle_allocated,
)


class VehiclesShipment(Document):
	def validate(self):
		self._apply_auto_stock_numbers()
		self._sync_reserve_to_order()
		self._set_eta_warehouse_from_sla()

	def _apply_auto_stock_numbers(self):
		settings = frappe.get_single("Vehicle Stock Settings")
		if not (settings.automatically_create_stock_number and settings.last_automated_stock_no):
			return
		last_no = settings.last_automated_stock_no
		match = re.match(r"^([a-zA-Z]+)(\d+)$", last_no)
		if not match:
			return
		prefix = match.group(1)
		number_str = match.group(2)
		number_length = len(number_str)
		full_number = int(number_str)
		updated = False
		for row in self.vehicles_shipment_items:
			if not row.stock_no:
				full_number += 1
				row.stock_no = prefix + str(full_number).zfill(number_length)
				updated = True
		if updated:
			frappe.db.set_value(
				"Vehicle Stock Settings",
				"Vehicle Stock Settings",
				"last_automated_stock_no",
				prefix + str(full_number).zfill(number_length),
			)

	def _sync_reserve_to_order(self):
		for row in self.vehicles_shipment_items:
			if row.reserve_to_order:
				order = frappe.get_doc("Head Office Vehicle Orders", row.reserve_to_order)
				order.shipment_stock = row.vin_serial_no
				order.shipment_no = self.name
				order.shipment_target_warehouse = row.target_warehouse
				order.model_delivered = row.model_code
				order.colour_delivered = row.colour
				order.engine_no = row.engine_no
				order.save(ignore_permissions=True)

	def _set_eta_warehouse_from_sla(self):
		if self.eta_warehouse:
			return
		sla_days = frappe.db.get_single_value("Vehicle Stock Settings", "sla_days") or 0
		if sla_days > 0:
			base_date = self.eta_harbour or nowdate()
			self.eta_warehouse = add_days(base_date, sla_days)

	@frappe.whitelist()
	def create_vehicle_plans(self, vin_serial_no, model_code):
		model_doc = frappe.get_doc("Model Administration", model_code)
		default_plan = model_doc.default_service_plan
		default_warranty = model_doc.default_warranty_plan
		created = []
		if default_warranty:
			warranty_plan = frappe.get_doc({
				"doctype": "Vehicle Linked Warranty Plan",
				"vin_serial_no": vin_serial_no,
				"warranty_plan": default_warranty,
				"status": "Pending Activation",
			})
			warranty_plan.insert(ignore_permissions=True)
			created.append(f"Warranty: {warranty_plan.name}")
		if default_plan:
			service_plan = frappe.get_doc({
				"doctype": "Vehicle Linked Service Plan",
				"vin_serial_no": vin_serial_no,
				"service_plan": default_plan,
				"status": "Pending Activation",
			})
			service_plan.insert(ignore_permissions=True)
			created.append(f"Service: {service_plan.name}")
		frappe.db.commit()
		return ", ".join(created) if created else _("No default plans configured for this model")



	@frappe.whitelist()
	def create_stock_entry(self, selected_items):
		selected_items = frappe.parse_json(selected_items)
		to_receive = _filter_already_received(selected_items)
		if not to_receive:
			return "Received"

		try:
			self.create_or_update_items(to_receive)
			self.create_stock_entry_for_serial_numbers(to_receive)
			self.create_vehicles_stock_entries(to_receive)
			self.create_vehicles_card(to_receive)
			self.check_head_office_orders(to_receive)
			self.create_reserve_doc(to_receive)
			frappe.db.commit()
			_fire_on_vehicle_shipment_received(to_receive)
			return "Received"
		except Exception:
			frappe.db.rollback()
			raise

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
			vin = item.get("vin_serial_no")
			if not vin or frappe.db.exists("Vehicle Stock", {"vin_serial_no": vin}):
				continue
			model_doc = frappe.get_doc("Model Administration", item.get("model_code"))
			availability_status = "Reserved" if model_doc.automatically_reserve_model else "Available"
			stock_dict = {
				"doctype": "Vehicle Stock",
				"vin_serial_no": vin,
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
				"availability_status": availability_status,
				"ho_date_received": today(),
			}
			new_vehicles_stock = frappe.get_doc(stock_dict)
			new_vehicles_stock.insert(ignore_permissions=True)
			if model_doc.automatically_reserve_model:
				frappe.get_doc({
					"doctype": "Reserved Vehicles",
					"vin_serial_no": vin,
					"dealer": self.dealer,
					"status": "Reserved",
					"reserve_reason": "Model set to automatically reserve",
					"reserve_from_date": nowdate(),
				}).insert(ignore_permissions=True)
			ship_doc_link = get_link_to_form("Vehicles Shipment", self.name)
			comment = (
				f"Vehicle has been received from shipment {ship_doc_link} with the following details:<br><br>"
				f"- VIN/Serial No: {vin}<br>- Model: {item.get('model_code')}<br>"
				f"- Supplier: {self.supplier}<br>- Shipment File No: {self.shipment_file_no}<br>"
				f"- Target Warehouse: {self.target_warehouse}"
			)
			new_vehicles_stock.add_comment("Comment", comment)
			formatted_colour = (item.get("colour") or "").split(" - ")[0].strip()
			hq_order_docs = frappe.db.get_all(
				"Head Office Vehicle Orders",
				filters={
					"model": item.get("model_code"),
					"colour": formatted_colour,
					"vinserial_no": "",
				},
				fields=["name"],
			)
			for hq_row in hq_order_docs:
				hq_doc = frappe.get_doc("Head Office Vehicle Orders", hq_row.name)
				if "Stock Available" not in (hq_doc.get_tags() or []):
					hq_doc.add_tag("Stock Available")
					hq_doc.save(ignore_permissions=True)
		return "Received"

	def create_vehicles_card(self, selected_items):
		return "Received"

	def check_head_office_orders(self, selected_items):
		auto_allocate_to_shipment_purposes = frappe.db.get_value(
			"Vehicles Order Purpose", {"automatically_allocate_received_shipments": 1}, "name"
		)
		if auto_allocate_to_shipment_purposes:
			for item in selected_items:
				vin_serial_no = item.get("vin_serial_no")
				if not vin_serial_no:
					continue
				model = item.get("model_code")
				description = item.get("model_description")
				engine_no = item.get("engine_no")
				formatted_colour = (item.get("colour") or "").split(" - ")[0].strip()

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

					_fire_on_vehicle_allocated(
						hq_order_doc.name, hq_order_doc.vinserial_no, hq_order_doc.model_delivered,
						hq_order_doc.model_description, hq_order_doc.colour_delivered, hq_order_doc.order_placed_by,
					)

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




	def create_reserve_doc(self, selected_items=None):
		if not selected_items:
			return

		auto_reserve_stock = frappe.db.get_single_value(
			'Vehicle Stock Settings', 
			'automatically_reserve_stock'
		)

		if not auto_reserve_stock:
			return

		dealer = None
		reserved_count = 0

		for item in selected_items:
			# Validate required fields
			if not item.get("vin_serial_no"):
				frappe.throw(_("Serial No is missing for item"))

			if not item.get("target_warehouse"):
				frappe.throw(_("Target warehouse is missing for item"))

			if not item.get("model_code"):
				frappe.throw(_("Model code is missing for an item."))

			# Get dealer from item or self
			dealer = item.get("dealer") or self.dealer

			if not dealer:
				frappe.throw(_("Dealer is missing for item"))

			# Check if Vehicle Stock exists (should exist after create_vehicles_stock_entries)
			if not frappe.db.exists("Vehicle Stock", item.get("vin_serial_no")):
				frappe.log_error(
					f"Vehicle Stock not found for VIN: {item.get('vin_serial_no')}", 
					"create_reserve_doc"
				)
				continue

			# Check if already reserved
			if frappe.db.exists("Reserved Vehicles", item.get("vin_serial_no")):
				continue

			# Create Reserved Vehicles document
			new_doc = frappe.new_doc('Reserved Vehicles')
			new_doc.vin_serial_no = item.get("vin_serial_no")
			new_doc.dealer = dealer

			if item.get("customer"):
				new_doc.customer = item.get("customer")

			new_doc.status = 'Reserved'
			new_doc.reserve_reason = 'Automatically Reserved'
			new_doc.reserve_from_date = nowdate()

			if item.get("reserve_to_date"):
				new_doc.reserve_to_date = item.get("reserve_to_date")

			new_doc.insert(ignore_permissions=True)

			# Update Vehicle Stock availability status
			stock_doc = frappe.get_doc('Vehicle Stock', item.get("vin_serial_no"))
			stock_doc.availability_status = 'Reserved'
			stock_doc.reserve_reason = 'Automatically Reserved'
			stock_doc.save(ignore_permissions=True)

			reserved_count += 1


def _filter_already_received(selected_items):
	return [item for item in selected_items if item.get("vin_serial_no") and not frappe.db.exists("Vehicle Stock", {"vin_serial_no": item.get("vin_serial_no")})]


def _fire_on_vehicle_shipment_received(selected_items):
	for method in frappe.get_hooks("on_vehicle_shipment_received"):
		try:
			frappe.get_attr(method)(selected_items=selected_items)
		except Exception:
			frappe.log_error(
				frappe.get_traceback(),
				f"on_vehicle_shipment_received hook failed: {method}",
			)