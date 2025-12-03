import frappe

def update_company_fields():
    company_list = frappe.get_all("Company")

    for company in company_list:
        company_doc = frappe.get_doc("Company", company["name"])
        abbr = company_doc.abbr  # assuming Company has an abbreviation field
        company_doc.custom_default_vehicles_stock_warehouse = f"Stores - {abbr}"
        company_doc.custom_trading_as = company_doc.name
        company_doc.save()
