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
