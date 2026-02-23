import frappe

@frappe.whitelist()
def check_stock_dealer(vins):

    if not vins:
        return {"valid": True}

    # If coming from JS, it may arrive as JSON string
    if isinstance(vins, str):
        vins = frappe.parse_json(vins)

    # If only one vehicle selected → always valid
    if len(vins) <= 1:
        return {"valid": True}

    dealers = []

    for vin in vins:
        dealer = frappe.db.get_value(
            "Vehicle Stock",
            {"vin_serial_no": vin},
            "dealer"
        )

        if dealer:
            dealers.append(dealer)

    # If somehow none found, treat as invalid
    if not dealers:
        return {"valid": False, "reason": "No Dealer Found"}

    first_dealer = dealers[0]

    for d in dealers:
        if d != first_dealer:
            return {"valid": False, "reason": "Dealer Mismatch"}

    return {"valid": True}