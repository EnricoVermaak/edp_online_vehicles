import frappe
from frappe.model.document import Document
import json

@frappe.whitelist()
def create_vehicle_service():
    """
    API to create a Vehicles Service document with separate child tables.
    JSON should be sent in raw body.
    """

    # Read raw JSON body
    data = frappe.local.request.get_data()
    data = json.loads(data)

    # Create parent document
    vs = frappe.get_doc({
        "doctype": "Vehicles Service",
        "vin_serial_no": data.get("vin_serial_no"),
        "odo_reading_hours": data.get("odo_reading_hours"),
        "service_type": data.get("service_type"),
        "service_status": data.get("service_status"),
        "dealer": data.get("dealer"),
        "customer": data.get("customer"),
        "job_card_no": data.get("job_card_no")
    })

    # Child Table 1: service_parts_items
    for part in data.get("service_parts_items", []):
        item_code = part.get("item")
        if frappe.db.exists("Item", item_code):
            vs.append("service_parts_items", {
                "item": item_code,
                "non_oem": part.get("non_oem", ""),
                "descrip": part.get("descrip", "")
            })
        else:
            vs.append("service_parts_items", {
                "item": "",
                "non_oem": item_code,
                "descrip": part.get("descrip", "")
            })

    # Child Table 2: service_labour_items
    for labour in data.get("service_labour_items", []):
        item_code = labour.get("item")
        if frappe.db.exists("Item", item_code):
            vs.append("service_labour_items", {
                "item": item_code,
                "non_oem": labour.get("non_oem", ""),
                "non_oem_description": labour.get("non_oem_description", "")
            })
        else:
            vs.append("service_labour_items", {
                "item": "",
                "non_oem": item_code,
                "non_oem_description": labour.get("non_oem_description", "")
            })

    # Save document
    vs.insert()
    frappe.db.commit()

    return {"status": "success", "name": vs.name}
