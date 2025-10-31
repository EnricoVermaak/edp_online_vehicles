import frappe


@frappe.whitelist()
def contract_expired():
	equip_doc = frappe.get_all("Vehicle Stock", filters={"contract_end_date": "2024-10-30"})

	equip_doc.status = "Expired"
	equip_doc.save()
	frappe.db.commit()

@frappe.whitelist()
def create_vehicle_plans(vin_serial_no, model_code, status):
    if status != "Received":
        return "Skipped: Status not Received"

    model_doc = frappe.get_doc("Model Administration", model_code)
    default_plan = model_doc.default_service_plan

    if not default_plan:
        return f"No default service plan found for {model_code}"

    # 1️⃣ Create Vehicle Linked Warranty Plan
    warranty_plan = frappe.get_doc({
        "doctype": "Vehicle Linked Warranty Plan",
        "vin_serial_no": vin_serial_no,
        "warranty_plan": default_plan,
        "status": "Pending Activation"
    })
    warranty_plan.insert(ignore_permissions=True)

    # 2️⃣ Create Vehicle Linked Service Plan
    service_plan = frappe.get_doc({
        "doctype": "Vehicle Linked Service Plan",
        "vin__serial_no": vin_serial_no,
        "service_plan": default_plan,
        "status": "Pending Activation"
    })
    service_plan.insert(ignore_permissions=True)

    frappe.db.commit()

    return f"Created Warranty: {warranty_plan.name}, Service: {service_plan.name}"
