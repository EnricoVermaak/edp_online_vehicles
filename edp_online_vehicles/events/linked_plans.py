import frappe



@frappe.whitelist()
def create_linked_plans(selected_items):
    selected_items = frappe.parse_json(selected_items)
    for row in selected_items:
        create_vehicle_plans(row.get("vin_serial_no"), row.get("model_code"))
    frappe.db.commit()


def create_vehicle_plans(vin_serial_no, model_code):
    model_doc = frappe.get_doc("Model Administration", model_code)
    default_plan = model_doc.default_service_plan
    default_warranty = model_doc.default_warranty_plan

    if default_warranty:
        frappe.get_doc({
            "doctype": "Vehicle Linked Warranty Plan",
            "vin_serial_no": vin_serial_no,
            "warranty_plan": default_warranty,
            "status": "Pending Activation",
        }).insert(ignore_permissions=True)

    if default_plan:
        frappe.get_doc({
            "doctype": "Vehicle Linked Service Plan",
            "vin_serial_no": vin_serial_no,
            "service_plan": default_plan,
            "status": "Pending Activation",
        }).insert(ignore_permissions=True)

    return "Plans created successfully!"