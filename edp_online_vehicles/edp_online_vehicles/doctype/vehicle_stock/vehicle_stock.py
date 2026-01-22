# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_years, add_months, today, getdate
from frappe.utils import get_datetime, now_datetime
from datetime import datetime, timedelta
from edp_online_vehicles.events.vehicle_aging import calculate_vehicle_ages


class VehicleStock(Document):
    def validate(self):
        # -------- Remove duplicates in table_pcgj based on warranty_plan_description --------
        seen = set()
        unique_rows_pcgj = []
        for row in self.table_pcgj:
            if row.warranty_plan_description not in seen:
                seen.add(row.warranty_plan_description)
                unique_rows_pcgj.append(row)
        self.table_pcgj = unique_rows_pcgj

        # -------- Remove duplicates in table_gtny based on service_plan_description --------
        seen1 = set()
        unique_rows_gtny = []
        for row in self.table_gtny:
            if row.service_plan_description not in seen1:
                seen1.add(row.service_plan_description)
                unique_rows_gtny.append(row)
        self.table_gtny = unique_rows_gtny

        # -------- Original logic --------
        self.service_period_years = sum([row.period_months or 0 for row in self.table_gtny])
        self.service_km_hours_limit = max([row.odo_limit or 0 for row in self.table_gtny], default=0)

        if self.availability_status == "Sold" and not self.service_start_date:
            self.service_start_date = frappe.utils.today()
            self.service_end_date = add_months(self.service_start_date, self.service_period_years or 0)

        self.update_warranty_period()
        self.update_warranty_km_hours_limit()
        self.sort_warranty_plans_by_creation()

        if self.warranty_period_years and self.warranty_start_date:
            self.warranty_end_date = add_months(self.warranty_start_date, int(self.warranty_period_years))

        if self.service_period_years and self.service_start_date:
            self.service_end_date = add_months(self.service_start_date, int(self.service_period_years))

        self.calculate_vehicle_aging()

        self.check_and_set_model_conversion_date()

    def calculate_vehicle_aging(self):
        if self.availability_status == "Sold":
            return

        ages = calculate_vehicle_ages({
            "name": self.name,
            "ho_date_received": self.ho_date_received,
            "model_conversion_date": self.model_conversion_date,
            "in_transit_date": self.in_transit_date,
            "delivery_date": self.delivery_date
        })

        # Update instance attributes
        self.head_office_age = ages["head_office_age"]
        self.model_conversion_age = ages["model_conversion_age"]
        self.in_transit_age = ages["in_transit_age"]
        self.dealer_age = ages["dealer_age"]
        self.total_age = ages["total_age"]

    def check_and_set_model_conversion_date(self):
        if self.model_conversion_date:
            return

        # Check if this vehicle exists in any Model Conversion records
        conversion_records = frappe.db.sql("""
            SELECT mc.conversion_date
            FROM `tabModel Conversion` mc
            INNER JOIN `tabVehicles Item` vi ON vi.parent = mc.name
            WHERE vi.vin_serial_no = %s
            ORDER BY mc.conversion_date ASC
            LIMIT 1
        """, (self.name,), as_dict=True)

        if conversion_records:
            self.model_conversion_date = conversion_records[0].conversion_date
            frappe.db.set_value("Vehicle Stock", self.name, "model_conversion_date", self.model_conversion_date, update_modified=False)

    def on_update(self):
        self._handle_deleted_warranty_plans()
        self._handle_added_warranty_plans()

    def _handle_added_warranty_plans(self):
        if not hasattr(self, 'table_pcgj'):
            return

        doc_before_save = self.get_doc_before_save()
        previous_plans = set()
        if doc_before_save and hasattr(doc_before_save, 'table_pcgj'):
            previous_plans = {row.warranty_plan_description for row in doc_before_save.table_pcgj if row.warranty_plan_description}

        current_plans = {row.warranty_plan_description for row in self.table_pcgj if row.warranty_plan_description}

        added_plans = current_plans - previous_plans

        for plan_description in added_plans:
            linked_plan_name = frappe.db.exists("Vehicle Linked Warranty Plan", plan_description) or frappe.db.get_value(
                "Vehicle Linked Warranty Plan",
                {"warranty_plan": plan_description, "vin_serial_no": self.name},
                "name"
            )

            if linked_plan_name:
                try:
                    linked_plan_doc = frappe.get_doc("Vehicle Linked Warranty Plan", linked_plan_name)
                    if linked_plan_doc.status != "Active":
                        linked_plan_doc.status = "Active"
                        linked_plan_doc.save(ignore_permissions=True)
                        frappe.db.commit()
                except Exception as e:
                    frappe.log_error(f"Error updating status for Vehicle Linked Warranty Plan {linked_plan_name}: {str(e)}")

    def _handle_deleted_warranty_plans(self):
        if not hasattr(self, 'table_pcgj'):
            return

        doc_before_save = self.get_doc_before_save()
        if not doc_before_save or not hasattr(doc_before_save, 'table_pcgj'):
            return

        previous_plans = {row.warranty_plan_description for row in doc_before_save.table_pcgj if row.warranty_plan_description}
        current_plans = {row.warranty_plan_description for row in self.table_pcgj if row.warranty_plan_description}
        deleted_plans = previous_plans - current_plans

        for plan_description in deleted_plans:
            linked_plan_name = frappe.db.exists("Vehicle Linked Warranty Plan", plan_description) or frappe.db.get_value(
                "Vehicle Linked Warranty Plan",
                {"warranty_plan": plan_description, "vin_serial_no": self.name},
                "name"
            )

            if linked_plan_name:
                try:
                    linked_plan_doc = frappe.get_doc("Vehicle Linked Warranty Plan", linked_plan_name)
                    if linked_plan_doc.status == "Active":
                        linked_plan_doc.status = "Cancelled"
                        linked_plan_doc.save(ignore_permissions=True)
                        frappe.db.commit()
                except Exception as e:
                    frappe.log_error(f"Error updating status for Vehicle Linked Warranty Plan {linked_plan_name}: {str(e)}")

    def before_insert(self):
        if self.type == "Used":
            setting_doc = frappe.get_doc("Vehicle Stock Settings")
            if setting_doc.automatically_create_stock_no_for_used_vehicles:
                stockNo = setting_doc.used_vehicles_last_stock_no
                newStockNo = self.increment_stock_number(stockNo)
                self.stock_no = newStockNo
                setting_doc.used_vehicles_last_stock_no = newStockNo
                setting_doc.save(ignore_permissions=True)
                frappe.db.commit()

    def before_save(self):
        for row in self.attached_documents:
            file_url = row.document
            if file_url and not frappe.db.exists({"doctype": "File", "file_url": file_url, "attached_to_doctype": self.doctype, "attached_to_name": self.name}):
                file_doc = frappe.get_doc({"doctype": "File", "file_url": file_url, "attached_to_doctype": self.doctype, "attached_to_name": self.name})
                file_doc.insert(ignore_permissions=True)
                frappe.db.commit()

    def after_insert(self):
        if not self.shipment_id:
            self.create_stock_entry()

    def create_stock_entry(self):
        self.create_or_update_items()
        serial_confirm = self.create_stock_entry_for_serial_numbers()
        cust_confirm = self.create_customer_for_stock()
        frappe.db.commit()
        if serial_confirm == "Confirm" and cust_confirm == "Confirm":
            return "Confirm"

    def create_or_update_items(self):
        if not frappe.db.exists("Item", self.model):
            item_name = frappe.utils.get_link_to_form("Model Administration", self.model)
            frappe.throw(f"{item_name} Item does not Exist")

    def create_stock_entry_for_serial_numbers(self):
        stock_entry = frappe.get_doc({"doctype": "Stock Entry", "stock_entry_type": "Material Receipt", "company": self.dealer, "items": []})
        if not self.vin_serial_no:
            frappe.throw(_("Serial No is missing for item"))
        if not self.model:
            frappe.throw(_("Model code is missing for an item."))

        com_doc = frappe.get_doc("Company", self.dealer)
        if not com_doc.custom_default_vehicles_stock_warehouse:
            com_doc.custom_default_vehicles_stock_warehouse = "Stores - " + com_doc.abbr
            com_doc.save()

        stock_entry.append("items", {
            "item_code": self.model,
            "qty": 1,
            "basic_rate": 0,
            "serial_no": self.vin_serial_no,
            "t_warehouse": com_doc.custom_default_vehicles_stock_warehouse,
            "allow_zero_valuation_rate": 1
        })

        stock_entry.save()
        stock_entry.submit()
        self.target_warehouse = com_doc.custom_default_vehicles_stock_warehouse
        return "Confirm"

    def create_customer_for_stock(self):
        if self.import_customer_name and self.import_customer_surname and self.import_customer_email_address:
            cust_doc = frappe.new_doc("Dealer Customer")
            cust_doc.customer_type = "Individual"
            cust_doc.customer_name = self.import_customer_name
            cust_doc.customer_surname = self.import_customer_surname
            cust_doc.email = self.import_customer_email_address
            cust_doc.check_qvlp = "No"
            cust_doc.would_you_like_to_receive_marketing_updates_via_email = "No"
            cust_doc.would_you_like_to_receive_marketing_updates_via_post = "No"
            cust_doc.did_you_confirm_all_popi_regulations_with_your_customer = "Yes"
            cust_doc.insert()
            self.customer = cust_doc.name
            self.save()
            return "Confirm"

    def update_warranty_period(self):
        if hasattr(self, 'table_pcgj') and self.table_pcgj:
            total_months = sum(int(plan.period_months) for plan in self.table_pcgj if plan.period_months)
            self.warranty_period_years = total_months
        else:
            self.warranty_period_years = 0

    def sort_warranty_plans_by_creation(self):
        if hasattr(self, 'table_pcgj') and self.table_pcgj:
            def get_creation_time(plan):
                if plan.warranty_plan_description:
                    creation = frappe.db.get_value(
                        "Vehicles Warranty Plan Administration",
                        plan.warranty_plan_description,
                        "creation"
                    )
                    if creation:
                        return get_datetime(creation)
                    return now_datetime()
                return now_datetime()

            self.table_pcgj.sort(key=lambda x: (get_creation_time(x), x.idx or 999))
            for idx, plan in enumerate(self.table_pcgj, start=1):
                plan.idx = idx

    def update_warranty_km_hours_limit(self):
        if hasattr(self, 'table_pcgj') and self.table_pcgj:
            max_odo_limit = max([plan.warranty_odo_limit or 0 for plan in self.table_pcgj], default=0)
            self.warranty_km_hours_limit = int(max_odo_limit) if max_odo_limit > 0 else None

    def increment_stock_number(self, stock_number):
        prefix = "".join(filter(str.isalpha, stock_number))
        number = "".join(filter(str.isdigit, stock_number))
        incremented_number = str(int(number) + 1).zfill(6)
        return prefix + incremented_number




@frappe.whitelist()
def set_vehicle_received_date(doc, method=None):
    if doc.stock_entry_type == "Material Receipt":
        for item in doc.items:
            if item.serial_no:
                if frappe.db.exists("Vehicle Stock", item.serial_no):
                    existing_date = frappe.db.get_value("Vehicle Stock", item.serial_no, "ho_date_received")
                    if not existing_date:
                        frappe.db.set_value("Vehicle Stock", item.serial_no, "ho_date_received", doc.posting_date, update_modified=False)
                        frappe.logger().info(f"Set HO received date for VIN {item.serial_no}: {doc.posting_date}")
