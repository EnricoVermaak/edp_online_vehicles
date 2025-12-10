import frappe
@frappe.whitelist()
def check_odo_limit(vin_serial_no, odo_reading):
    vehicle = frappe.get_doc("Vehicle Stock", vin_serial_no)

    odo = float(odo_reading or 0)
    is_valid = False

    if vehicle.table_pcgj:
        for row in vehicle.table_pcgj:
            max_limit = row.warranty_odo_limit or 0

            if 0 <= odo <= max_limit:
                is_valid = True

    # Show message on frontend but DO NOT stop form
    if not is_valid:
        frappe.msgprint("Odometer reading is outside the warranty limit!")

    return is_valid

@frappe.whitelist()
def check_clor(vin):
    if not vin:
        return []

    linked = frappe.get_all(
        "Vehicle Linked Warranty Plan",
        filters={"vin_serial_no": vin},
        fields=["warranty_plan"]
    )

    if not linked:
        return []

    warranty_plan = linked[0].warranty_plan
    plan_doc = frappe.get_doc(
        "Vehicles Warranty Plan Administration",
        warranty_plan
    )

    items_list = []
    for row in plan_doc.items:
        items_list.append(row.item)

    return items_list
