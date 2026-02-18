import frappe


def execute():
    items = frappe.db.set_value("Item",{"valuation_rate":0},"valuation_rate",1)
    frappe.db.commit()