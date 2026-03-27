import frappe

@frappe.whitelist()
def get_ifp_options():
    data = frappe.db.get_all("Plan Codes", pluck="ifp_days")
    return sorted(set(filter(None, data)))