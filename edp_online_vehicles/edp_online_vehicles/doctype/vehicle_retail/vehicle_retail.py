# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_months, now_datetime


class VehicleRetail(Document):
    def on_submit(self):
        self.update_linked_service_plan(self.name)
        self.update_linked_warranty_plan(self.name)

    @frappe.whitelist()
    def update_dealer_customer(self):
        dealer_cust_doc = frappe.get_doc("Dealer Customer", self.customer)
        if dealer_cust_doc:
            dealer_cust_doc.email = self.customer_email
            dealer_cust_doc.mobile = self.customer_mobile
            dealer_cust_doc.phone = self.customer_phone
            dealer_cust_doc.address = self.customer_address
            dealer_cust_doc.save(ignore_permissions=True)
            frappe.db.commit()

    # ---- Update Linked Service Plan ----
    def update_linked_service_plan(self, vehicle_retail_name):
        doc = frappe.get_doc("Vehicle Retail", vehicle_retail_name)
        activation_date = now_datetime()
        for row in doc.get("vehicles_sale_items"):
            if row.vin_serial_no:
                linked_docs = frappe.get_all(
                    "Vehicle Linked Service Plan",
                    filters={"vin__serial_no": row.vin_serial_no},
                    fields=["name", "service_period_limit_months"]
                )
                for record in linked_docs:
                    linked_doc = frappe.get_doc("Vehicle Linked Service Plan", record.name)
                    months = record.service_period_limit_months or 0
                    expiration_date = add_months(activation_date, months)
                    linked_doc.activation_date_time = activation_date
                    linked_doc.expiration_date_time = expiration_date
                    linked_doc.status = "Active"
                    linked_doc.save(ignore_permissions=True)
        frappe.db.commit()

    # ---- Update Linked Warranty Plan ----
    def update_linked_warranty_plan(self, vehicle_retail_name):
        doc = frappe.get_doc("Vehicle Retail", vehicle_retail_name)
        activation_date = now_datetime()
        for row in doc.get("vehicles_sale_items"):
            if row.vin_serial_no:
                linked_docs = frappe.get_all(
                    "Vehicle Linked Warranty Plan",
                    filters={"vin_serial_no": row.vin_serial_no},
                    fields=["name", "warranty_period_months"]
                )
                for record in linked_docs:
                    linked_doc = frappe.get_doc("Vehicle Linked Warranty Plan", record.name)
                    months = record.warranty_period_months or 0
                    expiration_date = add_months(activation_date, months)
                    linked_doc.activation_date_time = activation_date
                    linked_doc.expiration_date_time = expiration_date
                    linked_doc.status = "Active"
                    linked_doc.save(ignore_permissions=True)
        frappe.db.commit()

    # ---- Combined Function (called from JS) ----
  
