import re
import frappe


@frappe.whitelist()
def add_comment(docname, value):
	doc = frappe.get_doc("Request for Service", docname)
	doc.add_comment("Comment", f"Odo Reading updated from Service {value}")
	doc.save()


@frappe.whitelist()
def add_comments(doctype, docname, message):
	doc = frappe.get_doc(doctype, docname)
	doc.add_comment("Comment", message)
	doc.save()
	doc.submit()


@frappe.whitelist()
def get_dealers(model=None, colour=None):
    if not model or not colour:
        return []
    settings = frappe.get_single("Vehicle Stock Settings")
    allow = settings.allow_dealer_to_dealer_orders
    if allow:
        stock_dealers = frappe.get_all(
            "Vehicle Stock",
            filters={
                "model": model,
                "colour": colour,
                "availability_status": "Available"
            },
            pluck="dealer"
        )

        head_office_companies = frappe.get_all(
            "Company",
            filters={"custom_head_office": 1},
            pluck="name"
        )

        all_dealers = stock_dealers + head_office_companies

        all_dealers = list(set(all_dealers))

        return all_dealers
    
    
# /home/ahmad/bench-15/apps/edp_online_vehicles/edp_online_vehicles/events/add_comment.py



@frappe.whitelist()
def auto_generate_stock_numbers(shipment_name):
    """
    Auto-generate stock numbers for a Vehicles Shipment document.
    """
    shipment_doc = frappe.get_doc("Vehicles Shipment", shipment_name)
    settings = frappe.get_doc("Vehicle Stock Settings", "Vehicle Stock Settings")

    if not settings.automatically_create_stock_number:
        return "Auto generation disabled"

    last_no = settings.last_automated_stock_no
    if not last_no:
        return "No last stock number found"

    match = re.match(r"^([a-zA-Z]+)(\d+)$", last_no)
    if not match:
        return "Last stock number invalid format"

    prefix = match.group(1)
    number = int(match.group(2))
    updated = False

    for row in shipment_doc.vehicles_shipment_items:
        if not row.stock_no:
            number += 1
            row.stock_no = f"{prefix}{number}"
            updated = True

    if updated:
        shipment_doc.save(ignore_permissions=True)
        settings.last_automated_stock_no = f"{prefix}{number}"
        settings.save()

    return f"Stock numbers updated for shipment {shipment_name}"

