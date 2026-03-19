# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from collections import Counter

import frappe
from frappe.model.document import Document
from frappe.utils import add_to_date, getdate, flt, today
from frappe.model.naming import make_autoname
from frappe.utils import now_datetime


class PartOrder(Document):

    def autoname(self):
        prefix = frappe.db.get_single_value("Parts Settings", "part_order_no_prefix") or ""
        now = now_datetime()
        mm = now.strftime("%m")
        yy = now.strftime("%y")
        series = f"{prefix}-{mm}{yy}-.#####"	
        self.name = make_autoname(series)

    def before_insert(self):
        if not self.get("delivery_date"):
            settings = frappe.get_single("Parts Settings")
            hours = flt(settings.get("order_turn_around_time_hours") or 0)
            self.delivery_date = getdate(add_to_date(today(), hours=hours))

        total = 0
        for item in (self.get("table_avsu") or []):
            total += flt(item.qty)
        self.total_parts_ordered = total

    def validate(self):
        if self.docstatus == 0:
            table_avsu = self.get("table_avsu") or []
            table_eaco = self.get("table_eaco") or []

            if not table_avsu:
                self.set("table_eaco", [])
                return

            avsu_counter = Counter((row.get("ordered_from"), row.get("part_no")) for row in table_avsu)
            eaco_counter = Counter((row.get("ordered_from"), row.get("part_no")) for row in table_eaco)

            if avsu_counter != eaco_counter:
                self.set("table_eaco", [])
                for row in table_avsu:
                    new_row = self.append("table_eaco", {})
                    new_row.ordered_from = row.get("ordered_from")
                    new_row.part_no = row.get("part_no")
                    new_row.part_description = row.get("description")
                    new_row.qty_ordered = row.get("qty")
                    new_row.dealer = row.get("dealer")
            else:
                avsu_quantities = {}
                for row in table_avsu:
                    key = (row.get("ordered_from"), row.get("part_no"))
                    if key not in avsu_quantities:
                        avsu_quantities[key] = 0
                    avsu_quantities[key] += row.get("qty")

                for row in table_eaco:
                    key = (row.get("ordered_from"), row.get("part_no"))
                    if key in avsu_quantities:
                        row.qty_ordered = avsu_quantities[key]

        if self.order_type == "Warranty" and not self.warranty_claim:
            frappe.throw("Warranty Claim is required for Warranty orders.")

    def on_submit(self):
        hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")

        if not hq_company:
            frappe.throw("No Head Office company (custom_head_office=1) found.")

        warehouse_items = [
            item
            for item in self.table_avsu
            if item.order_from == "Warehouse" or item.order_from == "BackOrder"
        ]
        dealer_items = [item for item in self.table_avsu if item.order_from == "Dealer"]

        if warehouse_items:
            hq_doc = frappe.new_doc("HQ Part Order")
            hq_doc.order_type = self.order_type
            hq_doc.delivery_method = self.delivery_method
            hq_doc.dealer = self.dealer
            hq_doc.dealer_order_no = self.dealer_order_no
            hq_doc.sales_person = self.sales_person
            hq_doc.order_date_time = self.order_date_time
            hq_doc.part_order = self.name
            hq_doc.customer = self.customer
            if self.warranty_claim:
                hq_doc.warranty_claim = self.warranty_claim
            hq_doc.total_excl = self.total_excl
            hq_doc.vat = self.vat
            hq_doc.total_incl = self.total_incl

            if self.company_reg_no:
                hq_doc.company_reg_no = self.company_reg_no
                hq_doc.fleet_code = self.fleet_code
                hq_doc.email = self.fleet_customer_email
                hq_doc.mobile = self.fleet_customer_mobile
                hq_doc.phone = self.fleet_customer_phone
                hq_doc.customer_full_name = self.fleet_customer_name
                hq_doc.fleet_customer = self.fleet_customer
                hq_doc.adress = self.fleet_customer_address
            else:
                hq_doc.email = self.email
                hq_doc.mobile = self.mobile
                hq_doc.phone = self.phone
                hq_doc.customer_full_name = self.full_name
                hq_doc.customer = self.customer
                hq_doc.adress = self.address

            picking_doc = frappe.new_doc("Parts Picking")
            dispatch_doc = frappe.new_doc("Part Dispatch")

            child_meta = frappe.get_meta("Part Order Item")

            for item in warehouse_items:
                new_child = hq_doc.append("table_ugma", {})

                item_doc = frappe.get_doc("Item", item.get("part_no"))
                bin_location = item_doc.custom_bin_location if item_doc else ""

                picking_doc.append(
                    "parts_ordered",
                    {
                        "bin_location": bin_location or "",
                        "part_no": item.get("part_no"),
                        "description": item.get("description"),
                        "qty": item.get("qty"),
                    },
                )

                dispatch_doc.append(
                    "parts_ordered",
                    {
                        "bin_location": bin_location or "",
                        "part_no": item.get("part_no"),
                        "description": item.get("description"),
                        "qty": item.get("qty"),
                    },
                )

                item_dict = item.as_dict()
                for key in ["name", "parent", "doctype", "idx"]:
                    item_dict.pop(key, None)

                for field in child_meta.fields:
                    fname = field.fieldname
                    if fname in item_dict:
                        new_child.set(fname, item_dict.get(fname))

            hq_doc.insert(ignore_permissions=True)
            picking_doc.insert(ignore_permissions=True)
            dispatch_doc.insert(ignore_permissions=True)

        if dealer_items:
            dealer_items_dict = {}
            for item in dealer_items:
                dealer = item.dealer
                if dealer not in dealer_items_dict:
                    dealer_items_dict[dealer] = []
                dealer_items_dict[dealer].append(item)

            for dealer, items in dealer_items_dict.items():
                dealer_doc = frappe.new_doc("D2D Part Order")
                dealer_doc.order_type = self.order_type
                dealer_doc.delivery_method = self.delivery_method
                dealer_doc.order_placed_to = dealer
                dealer_doc.order_placed_by = self.dealer
                dealer_doc.order_datetime = self.order_date_time
                dealer_doc.sales_person = self.sales_person
                dealer_doc.status = "Pending"
                dealer_doc.part_order = self.name
                dealer_doc.total_excl = self.total_excl
                dealer_doc.vat = self.vat
                dealer_doc.total_incl = self.total_incl

                child_meta = frappe.get_meta("Part Order Item")

                for item in items:
                    new_child = dealer_doc.append("table_oqak", {})
                    item_dict = item.as_dict()

                    for key in ["name", "parent", "doctype", "idx"]:
                        item_dict.pop(key, None)

                    for field in child_meta.fields:
                        fname = field.fieldname
                        if fname in item_dict:
                            new_child.set(fname, item_dict.get(fname))

                dealer_doc.insert(ignore_permissions=True)

        frappe.db.commit()
