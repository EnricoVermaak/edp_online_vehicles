import frappe

@frappe.whitelist()
def get_warehouse_for_vin(vin_serial_no: str | None = None) -> str | None:
    """
    Returns the warehouse from the Serial No document for the given VIN/serial no.
    """
    if not vin_serial_no:
        return None
    # Reads directly from Serial No doc; VIN is saved as the Serial No name.
    warehouse = frappe.db.get_value("Serial No", vin_serial_no, "warehouse")
    return warehouse or None