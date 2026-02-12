# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from datetime import timedelta

import frappe
import frappe.utils
from frappe.model.document import Document
from frappe.utils import get_datetime



class PartsDeliveryNote(Document):
	def autoname(self):
		if self.part_order_no:
			# Check if there are existing orders with the same order_no
			if frappe.db.exists("Parts Delivery Note", {"part_order_no": self.part_order_no}):
				docs = frappe.get_all("Parts Delivery Note", filters={"part_order_no": self.part_order_no})

				index = 1

				if len(docs) > 0:
					index = (
						max(
							[
								int(doc.get("name").split("-")[3])
								for doc in docs
								if doc.get("name").split("-")[3].isdigit()
							],
							default=0,
						)
						+ 1
					)
			else:
				index = 1

			self.name = f"PDN-{self.part_order_no}-{index}"
		else:
			# Check if there are existing orders with the same order_no
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
			# Retrieve the HQ Part Order and linked Part Order documents
			hq_doc = frappe.get_doc("HQ Part Order", self.part_order_no)
			order_doc = frappe.get_doc("Part Order", hq_doc.part_order)

			# Get the current time (server time)
			now_dt = frappe.utils.now_datetime()

			# Loop through each part in the delivery_note_item child table
			for part in self.delivery_note_item:
				# --- Update HQ Part Order ---
				matching_record_hq = None
				for rec in hq_doc.get("table_qmpy"):
					if rec.part_no == part.part_no:
						matching_record_hq = rec
						break

				if matching_record_hq:
					# Update cumulative qty_delivered for HQ Part Order
					matching_record_hq.qty_delivered += part.qty_delivered
					percentage_delivered = (matching_record_hq.qty_delivered / part.qty_ordered) * 100

					# Calculate new delivery_time_hours based on HQ Part Order creation time
					time_diff = now_dt - frappe.utils.get_datetime(hq_doc.creation)
					new_delivery_time_str = self.timedelta_to_hhmmss(time_diff)

					# Update the matching record with new values
					matching_record_hq.delivery_time_hours = new_delivery_time_str
					matching_record_hq._delivered = percentage_delivered

					# If fully delivered, move record from table_qmpy to table_cipd
					if percentage_delivered >= 100:
						record_data = {
							"part_no": matching_record_hq.part_no,
							"qty_ordered": matching_record_hq.qty_ordered,
							"qty_delivered": matching_record_hq.qty_delivered,
							"delivery_time_hours": new_delivery_time_str,
							"_delivered": percentage_delivered,
							"last_delivery_note_datetime": self.delivery_time,
						}
						hq_doc.table_qmpy.remove(matching_record_hq)
						hq_doc.append("table_cipd", record_data)

				# --- Update Part Order ---
				matching_record_po = None
				for rec in order_doc.get("table_eaco"):
					if rec.part_no == part.part_no:
						matching_record_po = rec
						break

				if matching_record_po:
					# Update cumulative qty_delivered for Part Order
					matching_record_po.qty_delivered += part.qty_delivered
					percentage_delivered_po = (matching_record_po.qty_delivered / part.qty_ordered) * 100

					# Calculate new delivery_time_hours based on Part Order creation time
					time_diff_po = now_dt - frappe.utils.get_datetime(order_doc.creation)
					new_delivery_time_str_po = self.timedelta_to_hhmmss(time_diff_po)

					# Update the matching record with new values
					matching_record_po.delivery_time_hours = new_delivery_time_str_po
					matching_record_po._delivered = percentage_delivered_po

					# If fully delivered, move record from table_eaco to table_poxl
					if percentage_delivered_po >= 100:
						record_data_po = {
							"part_no": matching_record_po.part_no,
							"qty_ordered": matching_record_po.qty_ordered,
							"qty_delivered": matching_record_po.qty_delivered,
							"delivery_time_hours": new_delivery_time_str_po,
							"_delivered": percentage_delivered_po,
							"last_delivery_note_datetime": self.delivery_time,
						}
						order_doc.table_eaco.remove(matching_record_po)
						order_doc.append("table_poxl", record_data_po)

			total_dealer_billing = 0
			total_delivered = 0

			if order_doc.table_eaco:
				for row in order_doc.table_eaco:
					price_list = frappe.db.get_value(
						"Item Price", {"item_code": row.part_no}, "price_list_rate"
					)

					total_dealer_billing += price_list * (row.qty_ordered - (row.qty_delivered or 0))
					total_delivered += row.qty_ordered - (row.qty_delivered or 0)

				order_doc.total_undelivered_parts_qty = total_delivered
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

					total_dealer_billing += price_list * row.qty_delivered
					total_delivered += row.qty_delivered

				order_doc.total_delivered_parts_qty = total_delivered
				order_doc.total_delivered_parts_dealer_billing = total_dealer_billing
			else:
				order_doc.total_delivered_parts_qty = 0
				order_doc.total_delivered_parts_dealer_billing = 0

			if order_doc.total_parts_ordered > 0:
				order_doc.total_parts_delivered = (
					order_doc.total_parts_ordered - order_doc.total_undelivered_parts_qty
				)

			if order_doc.total_parts_delivered > 0:
				order_doc._order_delivered = (
					order_doc.total_parts_delivered / order_doc.total_parts_ordered
				) * 100

			# Save both documents and commit changes
			hq_doc.save(ignore_permissions=True)
			order_doc.save(ignore_permissions=True)
			frappe.db.commit()
		elif self.d2d_part_order:
			# Retrieve the HQ Part Order and linked Part Order documents
			d2d_doc = frappe.get_doc("D2D Part Order", self.d2d_part_order)
			order_doc = frappe.get_doc("Part Order", d2d_doc.part_order)

			# Get the current time (server time)
			now_dt = frappe.utils.now_datetime()

			# Loop through each part in the delivery_note_item child table
			for part in self.delivery_note_item:
				# --- Update HQ Part Order ---
				matching_record_hq = None
				for rec in d2d_doc.get("table_mzrh"):
					if rec.part_no == part.part_no:
						matching_record_d2d = rec
						break

				if matching_record_d2d:
					# Update cumulative qty_delivered for HQ Part Order
					matching_record_d2d.qty_delivered += part.qty_delivered
					percentage_delivered = (matching_record_d2d.qty_delivered / part.qty_ordered) * 100

					# Calculate new delivery_time_hours based on D2D Part Order creation time
					time_diff = now_dt - frappe.utils.get_datetime(d2d_doc.creation)
					new_delivery_time_str = self.timedelta_to_hhmmss(time_diff)

					# Update the matching record with new values
					matching_record_d2d.delivery_time_hours = new_delivery_time_str
					matching_record_d2d._delivered = percentage_delivered

					if percentage_delivered >= 100:
						record_data = {
							"part_no": matching_record_d2d.part_no,
							"qty_ordered": matching_record_d2d.qty_ordered,
							"qty_delivered": matching_record_d2d.qty_delivered,
							"delivery_time_hours": new_delivery_time_str,
							"_delivered": percentage_delivered,
							"last_delivery_note_datetime": self.delivery_time,
						}
						d2d_doc.table_mzrh.remove(matching_record_d2d)
						d2d_doc.append("table_mqnk", record_data)

				# --- Update Part Order ---
				matching_record_po = None
				for rec in order_doc.get("table_eaco"):
					if (rec.part_no == part.part_no) and (rec.dealer == part.dealer):
						matching_record_po = rec
						break

				if matching_record_po:
					# Update cumulative qty_delivered for Part Order
					matching_record_po.qty_delivered += part.qty_delivered
					percentage_delivered_po = (matching_record_po.qty_delivered / part.qty_ordered) * 100

					# Calculate new delivery_time_hours based on Part Order creation time
					time_diff_po = now_dt - frappe.utils.get_datetime(order_doc.creation)
					new_delivery_time_str_po = self.timedelta_to_hhmmss(time_diff_po)

					# Update the matching record with new values
					matching_record_po.delivery_time_hours = new_delivery_time_str_po
					matching_record_po._delivered = percentage_delivered_po

					# If fully delivered, move record from table_eaco to table_poxl
					if percentage_delivered_po >= 100:
						record_data_po = {
							"part_no": matching_record_po.part_no,
							"qty_ordered": matching_record_po.qty_ordered,
							"qty_delivered": matching_record_po.qty_delivered,
							"delivery_time_hours": new_delivery_time_str_po,
							"_delivered": percentage_delivered_po,
							"last_delivery_note_datetime": self.delivery_time,
						}
						order_doc.table_eaco.remove(matching_record_po)
						order_doc.append("table_poxl", record_data_po)

			total_dealer_billing = 0
			total_delivered = 0

			if order_doc.table_eaco:
				for row in order_doc.table_eaco:
					price_list = frappe.db.get_value(
						"Item Price", {"item_code": row.part_no}, "price_list_rate"
					)

					total_dealer_billing += price_list * (row.qty_ordered - (row.qty_delivered or 0))
					total_delivered += row.qty_ordered - (row.qty_delivered or 0)

				order_doc.total_undelivered_parts_qty = total_delivered
				order_doc.total_undelivered_parts_dealer_billing_excl = total_dealer_billing
			else:
				order_doc.total_undelivered_parts_qty = 0
				order_doc.total_undelivered_parts_dealer_billing_excl = 0

			total_dealer_billing = 0
			total_delivered = 0

			if order_doc.table_poxl:
				for row in order_doc.table_poxl:
					price_list = frappe.db.get_value(
						"Item Price", {"item_code": row.part_no}, "price_list_rate"
					)

					total_dealer_billing += price_list * row.qty_delivered
					total_delivered += row.qty_delivered

				order_doc.total_delivered_parts_qty = total_delivered
				order_doc.total_delivered_parts_dealer_billing_excl = total_dealer_billing
			else:
				order_doc.total_delivered_parts_qty = 0
				order_doc.total_delivered_parts_dealer_billing_excl = 0

			if order_doc.total_parts_ordered > 0:
				order_doc.total_parts_delivered = (
					order_doc.total_parts_ordered - order_doc.total_undelivered_parts_qty
				)

			if order_doc.total_parts_delivered > 0:
				order_doc._order_delivered = (
					order_doc.total_parts_delivered / order_doc.total_parts_ordered
				) * 100

			# Save both documents and commit changes
			d2d_doc.save(ignore_permissions=True)
			order_doc.save(ignore_permissions=True)

			try:
				company = frappe.get_all("Company", {"custom_head_office": 1}, pluck="name")
				com_doc = frappe.get_doc("Company", self.dealer, ignore_permissions=True)
				hq_com_doc = frappe.get_doc("Company", company, ignore_permissions=True)

				if not hq_com_doc.custom_default_vehicles_stock_warehouse:
					hq_com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + hq_com_doc.abbr
					hq_com_doc.save(ignore_permissions=True)

				if not com_doc.custom_default_vehicles_stock_warehouse:
					com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
					com_doc.save(ignore_permissions=True)

				new_issue = frappe.new_doc("Stock Entry")

				new_issue.stock_entry_type = "Material Issue"
				new_issue.company = company

				for row in self.delivery_note_item:
					new_issue.append(
						"items",
						{
							"s_warehouse": hq_com_doc.custom_default_vehicles_stock_warehouse,
							"item_code": row.part_no,
							"qty": row.qty_delivered,
							"uom": "Unit",
							"allow_zero_valuation_rate": 1,
						},
					)

				new_issue.insert(ignore_permissions=True)
				new_issue.submit()

				new_receipt = frappe.new_doc("Stock Entry")

				new_receipt.stock_entry_type = "Material Receipt"
				new_receipt.company = self.dealer

				for row in self.delivery_note_item:
					new_receipt.append(
						"items",
						{
							"s_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
							"item_code": row.part_no,
							"qty": row.qty_delivered,
							"uom": "Unit",
							"allow_zero_valuation_rate": 1,
						},
					)

				new_receipt.insert(ignore_permissions=True)
				new_receipt.submit()
			except Exception as e:
				frappe.msgprint(f"An error occurred: {e!s}")

			frappe.db.commit()

	def before_submit(self):
		self.status = "Delivered"

	def hhmmss_to_timedelta(self, time_str):
		"""Convert a HH:MM:SS string to a timedelta object."""
		h, m, s = map(int, time_str.split(":"))
		return timedelta(hours=h, minutes=m, seconds=s)

	def timedelta_to_hhmmss(self, td):
		"""Convert a timedelta object to a HH:MM:SS string."""
		total_seconds = int(td.total_seconds())
		h = total_seconds // 3600
		m = (total_seconds % 3600) // 60
		s = total_seconds % 60
		return f"{h:02}:{m:02}:{s:02}"
	
	# def after_insert(self):
	# 	doc = frappe.new_doc("Delivery Note")
	# 	for item in self.table_qoik:
	# 		doc.append("locations", {"item_code": item.part_no, "qty": item.qty_ordered})
	# 	doc.save()

def before_save(doc, method=None):
    if not doc.get("erp_delivery_note"):
        dn = create_delivery_note(doc)
        doc.erp_delivery_note = dn.name
    else:
        update_delivery_note(doc)




def on_submit(doc):
    if doc.erp_delivery_note:
        dn = frappe.get_doc("Delivery Note", doc.erp_delivery_note)
        if dn.docstatus == 0:
            dn.submit()


def on_cancel(doc):
    if doc.erp_delivery_note:
        dn = frappe.get_doc("Delivery Note", doc.erp_delivery_note)
        if dn.docstatus == 1:
            dn.cancel()


def create_delivery_note(doc):
    dn = frappe.new_doc("Delivery Note")
    dn.custom_hq_part_order= doc.part_order_no

    if doc.deliver_to == "Customer":
        dn.customer = doc.customer or doc.fleet_customer
    else:
        dn.customer = doc.dealer

    if doc.delivery_time:
        dt = get_datetime(doc.delivery_time)
        dn.posting_date = dt.date()
        dn.posting_time = dt.time()

    for row in doc.delivery_note_item:
        dn.append("items", {
            "item_code": row.part_no,
            "qty": row.qty_ordered,
        })

    dn.insert(ignore_permissions=True)
    return dn


def update_delivery_note(doc):
    if not doc.erp_delivery_note:
        return

    dn = frappe.get_doc("Delivery Note", doc.erp_delivery_note)

    if dn.docstatus != 0:
        return

    if doc.deliver_to == "Customer":
        dn.customer = doc.customer or doc.fleet_customer
    else:
        dn.customer = doc.dealer

    if doc.delivery_time:
        dt = get_datetime(doc.delivery_time)
        dn.posting_date = dt.date()
        dn.posting_time = dt.time()

    dn.set("items", [])

    for row in doc.delivery_note_item:
        dn.append("items", {
            "item_code": row.part_no,
            "qty": row.qty_ordered
        })

    dn.save(ignore_permissions=True)