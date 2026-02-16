import re
import frappe
from frappe.model.document import Document
class ModelAdministration(Document):

    def after_insert(self):
        if not frappe.db.exists("Item", self.model_code):
            new_item = frappe.get_doc({
                "doctype": "Item",
                "item_code": self.model_code,
                "item_name": self.model_description,
                "item_group": "Vehicles",
                "stock_uom": "Unit",
                "has_serial_no": 1,
                "is_stock_item": 1,
                "is_fixed_asset": 0,
                "is_sales_item": 1,
            })
            new_item.save(ignore_permissions=True)

        setting_doc = frappe.get_doc("Vehicle Stock Settings")
        if setting_doc.automatically_create_model_colours_for_new_model:
            if setting_doc.model_colours and len(setting_doc.model_colours) > 0:
                for colour in setting_doc.model_colours:
                    new_colour = frappe.new_doc("Model Colour")
                    new_colour.model = self.model_code
                    new_colour.colour = colour.colour
                    new_colour.insert(ignore_permissions=True)

        doc = frappe.db.get_single_value("Vehicle Stock Settings", "create_other_service_schedule")
        if doc:
            new_doc = frappe.get_doc({
                "doctype": "Service Schedules",
                "model_code": self.model_code,
                "interval": "Other",
                "period_months": 0,
            })
            new_doc.insert(ignore_permissions=True)

        frappe.db.commit()
        
        if not self.model_default_image:
            stock_settings = frappe.get_doc("Vehicle Stock Settings")
            self.db_set("model_default_image", stock_settings.default_model_image)
                  

    def after_save(self):
        for row in self.model_colours:
            if row.colour:
                colour_name = row.colour + " - " + self.name

                if not frappe.db.exists("Model Colour", colour_name):
                    new_colour = frappe.new_doc("Model Colour")
                    new_colour.model = self.model_code
                    new_colour.colour = row.colour
                    new_colour.insert(ignore_permissions=True)
                else:
                    colour_doc = frappe.get_doc("Model Colour", colour_name)

                    if colour_doc.discontinued != row.discontinued:
                        colour_doc.discontinued = row.discontinued
                        colour_doc.save(ignore_permissions=True)

        stock_names = frappe.get_all("Vehicle Stock", filters={"model": self.name}, pluck="name")

        for name in stock_names:
            stock_doc = frappe.get_doc("Vehicle Stock", name)
            stock_doc.save(ignore_permissions=True)

        frappe.db.commit()

    def before_insert(self):
        max_allowance = frappe.db.get_single_value(
            "Vehicle Service Settings", "default_service_type_max_allowance"
        )
        min_allowance = frappe.db.get_single_value(
            "Vehicle Service Settings", "default_service_type_minimum_allowance"
        )

        self.service_type_max_allowance = max_allowance
        self.service_type_minimum_allowance = min_allowance
