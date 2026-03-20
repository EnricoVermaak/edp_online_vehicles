# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from datetime import timedelta

import frappe
import frappe.utils
from frappe.model.document import Document
from frappe.utils import get_datetime, flt

from edp_online_vehicles.edp_online_vehicles.doctype.hq_part_order.hq_part_order import (
	get_company_warehouse,
)


class PartsDeliveryNote(Document):
	def validate(self):
		if not self.part_order_no and not self.d2d_part_order:
			frappe.throw("Either HQ Part Order or D2D Part Order must be specified.")

		has_items = any(
			flt(row.qty_delivered) > 0 for row in (self.delivery_note_item or [])
		)
		if not has_items:
			frappe.throw("Please add at least one item with Qty Delivered greater than zero.")

		if self.part_picking_slip:
			existing = frappe.db.exists(
				"Parts Delivery Note",
				{
					"part_picking_slip": self.part_picking_slip,
					"docstatus": ["!=", 2],
					"name": ["!=", self.name],
				},
			)
			if existing:
				frappe.throw("A Parts Delivery Note already exists for this Part Picking Slip")

	def autoname(self):
		if self.part_order_no:
			if frappe.db.exists("Parts Delivery Note", {"part_order_no": self.part_order_no}):
				docs = frappe.get_all("Parts Delivery Note", filters={"part_order_no": self.part_order_no})
				index = 1
				if len(docs) > 0:
					index = (
						max(
							[
								int(doc.get("name").split("-")[2])
								for doc in docs
								if doc.get("name").split("-")[2].isdigit()
							],
							default=0,
						)
						+ 1
					)
			else:
				index = 1
			self.name = f"PDN-{self.part_order_no}-{index}"
		else:
			if frappe.db.exists("Parts Delivery Note", {"d2d_part_order": self.d2d_part_order}):
				docs = frappe.get_all("Parts Delivery Note", filters={"d2d_part_order": self.d2d_part_order})
				index = 1
				if len(docs) > 0:
					index = (
						max(
							[
								int(doc.get("name").split("-")[2])
								for doc in docs
								if doc.get("name").split("-")[2].isdigit()
							],
							default=0,
						)
						+ 1
					)
			else:
				index = 1
			self.name = f"PDN-{self.d2d_part_order}-{index}"

	def on_submit(self):
		if self.part_order_no:
			self._handle_hq_delivery()
		elif self.d2d_part_order:
			self._handle_d2d_delivery()

	def before_submit(self):
		self.status = "Delivered"


	def _handle_hq_delivery(self):
		hq_doc = frappe.get_doc("HQ Part Order", self.part_order_no)
		part_order_name = hq_doc.part_order
		now_dt = frappe.utils.now_datetime()

		self._create_delivery_note_hq(hq_doc)

		hq_doc.reload()
		order_doc = frappe.get_doc("Part Order", part_order_name)

		for part in self.delivery_note_item:
			self._update_hq_order_item(hq_doc, part, now_dt)
			self._update_part_order_item(order_doc, part, now_dt)

		self._recalculate_hq_order_totals(hq_doc)
		self._recalculate_part_order_totals(order_doc)
		self._sync_qty_supplied(hq_doc)

		hq_doc.flags.ignore_validate_update_after_submit = True
		hq_doc.save(ignore_permissions=True)
		order_doc.flags.ignore_validate_update_after_submit = True
		order_doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _create_delivery_note_hq(self, hq_doc):
		hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
		if not hq_company:
			frappe.throw("No Head Office company found")

		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": hq_doc.part_order, "company": hq_company, "docstatus": 1},
			"name",
		)

		so_doc = None
		so_item_map = {}
		if sales_order:
			so_doc = frappe.get_doc("Sales Order", sales_order)
			for si in so_doc.items:
				so_item_map[si.item_code] = si

		hq_warehouse = get_company_warehouse(hq_company)

		dn = frappe.new_doc("Delivery Note")
		dn.company = hq_company
		dn.custom_hq_part_order = self.part_order_no

		if self.deliver_to == "Customer":
			dn.customer = self.customer or self.fleet_customer
		else:
			dn.customer = self.dealer

		if self.delivery_time:
			dt = get_datetime(self.delivery_time)
			dn.posting_date = dt.date()
			dn.posting_time = dt.time()

		for row in self.delivery_note_item:
			item_data = {
				"item_code": row.part_no,
				"qty": row.qty_delivered,
				"custom_qty_delivered": row.qty_delivered,
				"warehouse": hq_warehouse,
			}

			so_item = so_item_map.get(row.part_no)
			if so_item:
				item_data["against_sales_order"] = sales_order
				item_data["so_detail"] = so_item.name

			dn.append("items", item_data)

		total_custom_qty_delivered = sum(row.qty_delivered for row in self.delivery_note_item)
		dn.custom_total_quantity_delivered = total_custom_qty_delivered

		dn.insert(ignore_permissions=True)
		dn.submit()

		self._receive_stock_at_dealer(hq_company)

	def _receive_stock_at_dealer(self, hq_company):
		dealer_company = self.dealer
		if not dealer_company:
			frappe.throw("Dealer is not set on the Parts Delivery Note. Cannot receive stock.")

		dealer_warehouse = get_company_warehouse(dealer_company)

		receipt = frappe.new_doc("Stock Entry")
		receipt.stock_entry_type = "Material Receipt"
		receipt.company = dealer_company

		for row in self.delivery_note_item:
			receipt.append("items", {
				"t_warehouse": dealer_warehouse,
				"item_code": row.part_no,
				"qty": row.qty_delivered,
				"uom": "Unit",
				"allow_zero_valuation_rate": 1,
			})

		receipt.insert(ignore_permissions=True)
		receipt.submit()


	def _handle_d2d_delivery(self):
		d2d_doc = frappe.get_doc("D2D Part Order", self.d2d_part_order)
		part_order_name = d2d_doc.part_order
		now_dt = frappe.utils.now_datetime()

		self._create_delivery_note_d2d(d2d_doc)

		d2d_doc.reload()
		order_doc = frappe.get_doc("Part Order", part_order_name)

		for part in self.delivery_note_item:
			self._update_d2d_order_item(d2d_doc, part, now_dt)
			self._update_part_order_item_d2d(order_doc, part, now_dt)

		self._recalculate_part_order_totals(order_doc)

		d2d_doc.flags.ignore_validate_update_after_submit = True
		d2d_doc.save(ignore_permissions=True)
		order_doc.flags.ignore_validate_update_after_submit = True
		order_doc.save(ignore_permissions=True)
		frappe.db.commit()

	def _create_delivery_note_d2d(self, d2d_doc):
		supplier_company = d2d_doc.order_placed_to
		ordering_company = d2d_doc.order_placed_by

		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": d2d_doc.part_order, "company": supplier_company, "docstatus": 1},
			"name",
		)

		so_doc = None
		so_item_map = {}
		if sales_order:
			so_doc = frappe.get_doc("Sales Order", sales_order)
			for si in so_doc.items:
				so_item_map[si.item_code] = si

		supplier_warehouse = get_company_warehouse(supplier_company)

		dn = frappe.new_doc("Delivery Note")
		dn.company = supplier_company
		dn.customer = ordering_company

		if self.delivery_time:
			dt = get_datetime(self.delivery_time)
			dn.posting_date = dt.date()
			dn.posting_time = dt.time()

		for row in self.delivery_note_item:
			item_data = {
				"item_code": row.part_no,
				"qty": row.qty_delivered,
				"custom_qty_delivered": row.qty_delivered,
				"warehouse": supplier_warehouse,
			}

			so_item = so_item_map.get(row.part_no)
			if so_item:
				item_data["against_sales_order"] = sales_order
				item_data["so_detail"] = so_item.name

			dn.append("items", item_data)

		total_custom_qty_delivered = sum(row.qty_delivered for row in self.delivery_note_item)
		dn.custom_total_quantity_delivered = total_custom_qty_delivered

		dn.insert(ignore_permissions=True)
		dn.submit()

		ordering_warehouse = get_company_warehouse(ordering_company)

		receipt = frappe.new_doc("Stock Entry")
		receipt.stock_entry_type = "Material Receipt"
		receipt.company = ordering_company

		for row in self.delivery_note_item:
			receipt.append("items", {
				"t_warehouse": ordering_warehouse,
				"item_code": row.part_no,
				"qty": row.qty_delivered,
				"uom": "Unit",
				"allow_zero_valuation_rate": 1,
			})

		receipt.insert(ignore_permissions=True)
		receipt.submit()


	def _update_hq_order_item(self, hq_doc, part, now_dt):
		matching = None
		for rec in hq_doc.get("table_qmpy"):
			if rec.part_no == part.part_no:
				matching = rec
				break

		if not matching:
			return

		matching.qty_delivered = flt(matching.qty_delivered) + flt(part.qty_delivered)
		ordered = flt(matching.qty_ordered) or 1
		percentage = (flt(matching.qty_delivered) / ordered) * 100

		time_diff = now_dt - get_datetime(hq_doc.creation)
		matching.delivery_time_hours = self.timedelta_to_hhmmss(time_diff)
		matching._delivered = percentage

		if percentage >= 100:
			record_data = {
				"part_no": matching.part_no,
				"qty_ordered": matching.qty_ordered,
				"qty_delivered": matching.qty_delivered,
				"delivery_time_hours": matching.delivery_time_hours,
				"_delivered": percentage,
				"last_delivery_note_datetime": self.delivery_time,
			}
			hq_doc.table_qmpy.remove(matching)
			hq_doc.append("table_cipd", record_data)

	def _update_d2d_order_item(self, d2d_doc, part, now_dt):
		matching = None
		for rec in d2d_doc.get("table_mzrh"):
			if rec.part_no == part.part_no:
				matching = rec
				break

		if not matching:
			return

		matching.qty_delivered = flt(matching.qty_delivered) + flt(part.qty_delivered)
		ordered = flt(matching.qty_ordered) or 1
		percentage = (flt(matching.qty_delivered) / ordered) * 100

		time_diff = now_dt - get_datetime(d2d_doc.creation)
		matching.delivery_time_hours = self.timedelta_to_hhmmss(time_diff)
		matching._delivered = percentage

		if percentage >= 100:
			record_data = {
				"part_no": matching.part_no,
				"qty_ordered": matching.qty_ordered,
				"qty_delivered": matching.qty_delivered,
				"delivery_time_hours": matching.delivery_time_hours,
				"_delivered": percentage,
				"last_delivery_note_datetime": self.delivery_time,
			}
			d2d_doc.table_mzrh.remove(matching)
			d2d_doc.append("table_mqnk", record_data)

	def _update_part_order_item(self, order_doc, part, now_dt):
		matching = None
		for rec in order_doc.get("table_eaco"):
			if rec.part_no == part.part_no:
				matching = rec
				break

		if not matching:
			return

		matching.qty_delivered = flt(matching.qty_delivered) + flt(part.qty_delivered)
		ordered = flt(matching.qty_ordered) or 1
		percentage = (flt(matching.qty_delivered) / ordered) * 100

		time_diff = now_dt - get_datetime(order_doc.creation)
		matching.delivery_time_hours = self.timedelta_to_hhmmss(time_diff)
		matching._delivered = percentage

		if percentage >= 100:
			record_data = {
				"part_no": matching.part_no,
				"qty_ordered": matching.qty_ordered,
				"qty_delivered": matching.qty_delivered,
				"delivery_time_hours": matching.delivery_time_hours,
				"_delivered": percentage,
				"last_delivery_note_datetime": self.delivery_time,
			}
			order_doc.table_eaco.remove(matching)
			order_doc.append("table_poxl", record_data)

	def _update_part_order_item_d2d(self, order_doc, part, now_dt):
		matching = None
		for rec in order_doc.get("table_eaco"):
			if (rec.part_no == part.part_no) and (rec.dealer == part.dealer):
				matching = rec
				break

		if not matching:
			return

		matching.qty_delivered = flt(matching.qty_delivered) + flt(part.qty_delivered)
		ordered = flt(matching.qty_ordered) or 1
		percentage = (flt(matching.qty_delivered) / ordered) * 100

		time_diff = now_dt - get_datetime(order_doc.creation)
		matching.delivery_time_hours = self.timedelta_to_hhmmss(time_diff)
		matching._delivered = percentage

		if percentage >= 100:
			record_data = {
				"part_no": matching.part_no,
				"qty_ordered": matching.qty_ordered,
				"qty_delivered": matching.qty_delivered,
				"delivery_time_hours": matching.delivery_time_hours,
				"_delivered": percentage,
				"last_delivery_note_datetime": self.delivery_time,
			}
			order_doc.table_eaco.remove(matching)
			order_doc.append("table_poxl", record_data)

	def _recalculate_hq_order_totals(self, hq_doc):
		undelivered_billing = 0
		undelivered_qty = 0

		for row in (hq_doc.table_qmpy or []):
			price_list = flt(frappe.db.get_value(
				"Item Price", {"item_code": row.part_no}, "price_list_rate"
			))
			remaining = flt(row.qty_ordered) - flt(row.qty_delivered)
			undelivered_billing += price_list * remaining
			undelivered_qty += remaining

		hq_doc.total_undelivered_parts_qty = undelivered_qty
		hq_doc.total_undelivered_parts_dealer_billing_excl = undelivered_billing

		delivered_billing = 0
		delivered_qty = 0

		for row in (hq_doc.get("table_cipd") or []):
			price_list = flt(frappe.db.get_value(
				"Item Price", {"item_code": row.part_no}, "price_list_rate"
			))
			delivered_billing += price_list * flt(row.qty_delivered)
			delivered_qty += flt(row.qty_delivered)

		hq_doc.total_delivered_parts_qty = delivered_qty
		hq_doc.total_delivered_parts_dealer_billing_excl = delivered_billing

		if flt(hq_doc.total_qty_parts_ordered) > 0:
			hq_doc.total_qty_parts_delivered = flt(hq_doc.total_qty_parts_ordered) - undelivered_qty
			hq_doc._order_delivered = (
				flt(hq_doc.total_qty_parts_delivered) / flt(hq_doc.total_qty_parts_ordered)
			) * 100
		else:
			hq_doc.total_qty_parts_delivered = 0
			hq_doc._order_delivered = 0

	def _recalculate_part_order_totals(self, order_doc):
		"""Recalculate Part Order totals from its child tables."""
		total_dealer_billing = 0
		total_undelivered = 0

		if order_doc.table_eaco:
			for row in order_doc.table_eaco:
				price_list = frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				)
				total_dealer_billing += flt(price_list) * (flt(row.qty_ordered) - flt(row.qty_delivered))
				total_undelivered += flt(row.qty_ordered) - flt(row.qty_delivered)

			order_doc.total_undelivered_parts_qty = total_undelivered
			order_doc.total_undelivered_parts_dealer_billing = total_dealer_billing
		else:
			order_doc.total_undelivered_parts_qty = 0
			order_doc.total_undelivered_parts_dealer_billing = 0

		total_dealer_billing = 0
		total_delivered = 0

		if order_doc.table_poxl:
			for row in order_doc.table_poxl:
				price_list = frappe.db.get_value(
					"Item Price", {"item_code": row.part_no}, "price_list_rate"
				)
				total_dealer_billing += flt(price_list) * flt(row.qty_delivered)
				total_delivered += flt(row.qty_delivered)

			order_doc.total_delivered_parts_qty = total_delivered
			order_doc.total_delivered_parts_dealer_billing = total_dealer_billing
		else:
			order_doc.total_delivered_parts_qty = 0
			order_doc.total_delivered_parts_dealer_billing = 0

		if flt(order_doc.total_parts_ordered) > 0:
			order_doc.total_parts_delivered = (
				flt(order_doc.total_parts_ordered) - flt(order_doc.total_undelivered_parts_qty)
			)
			order_doc._order_delivered = (
				flt(order_doc.total_parts_delivered) / flt(order_doc.total_parts_ordered)
			) * 100
		else:
			order_doc.total_parts_delivered = 0
			order_doc._order_delivered = 0

	def _sync_qty_supplied(self, hq_doc):
		if not hq_doc.part_order:
			return

		hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
		sales_order = frappe.db.get_value(
			"Sales Order",
			{"custom_part_order": hq_doc.part_order, "company": hq_company, "docstatus": 1},
			"name",
		)
		if not sales_order:
			return

		so_doc = frappe.get_doc("Sales Order", sales_order)
		so_delivered = {}
		for item in so_doc.items:
			so_delivered[item.item_code] = flt(item.delivered_qty)

		for row in hq_doc.table_qmpy:
			if row.part_no in so_delivered:
				row.qty_supplied = so_delivered[row.part_no]

		for row in hq_doc.table_cipd:
			if row.part_no in so_delivered:
				row.qty_supplied = so_delivered[row.part_no]


	def hhmmss_to_timedelta(self, time_str):
		h, m, s = map(int, time_str.split(":"))
		return timedelta(hours=h, minutes=m, seconds=s)

	def timedelta_to_hhmmss(self, td):
		total_seconds = int(td.total_seconds())
		h = total_seconds // 3600
		m = (total_seconds % 3600) // 60
		s = total_seconds % 60
		return f"{h:02}:{m:02}:{s:02}"
