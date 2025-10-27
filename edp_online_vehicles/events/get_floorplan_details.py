import frappe

@frappe.whitelist()
def get_plan_code(bank):
    return frappe.get_all('Plan Codes', {'parent':bank})