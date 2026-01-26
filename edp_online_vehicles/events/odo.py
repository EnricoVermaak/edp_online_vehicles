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

@frappe.whitelist()
def check_duplicate_part(vin, part_no, current_claim=None):
    """
    Check if same part is already claimed for the same VIN
    in other warranty claims
    """
    if not vin or not part_no:
        return []

    filters = {
        "parenttype": "Vehicles Warranty Claims",
        "part_no": part_no
    }

    if current_claim:
        filters["parent"] = ["!=", current_claim]

    claims = frappe.db.sql("""
        SELECT wpi.parent
        FROM `tabWarranty Part Item` wpi
        INNER JOIN `tabVehicles Warranty Claims` wc
            ON wc.name = wpi.parent
        WHERE wc.vin_serial_no = %s
          AND wpi.part_no = %s
          {exclude_condition}
    """.format(
        exclude_condition="AND wpi.parent != %s" if current_claim else ""
    ),
    tuple(filter(None, [vin, part_no, current_claim])),
    as_dict=True)

    return [c.parent for c in claims]

@frappe.whitelist()
def check_duplicate_part(vin, part_no, current_claim=None):
    if not vin or not part_no:
        return {"is_duplicate": False}

    # Get other warranty claims for same VIN (exclude current one)
    claims = frappe.get_all(
        "Vehicles Warranty Claims",
        filters={
            "vin_serial_no": vin,
            "name": ["!=", current_claim]
        },
        pluck="name"
    )

    if not claims:
        return {"is_duplicate": False}

    # Check if part exists in any of those claims
    duplicate = frappe.get_all(
        "Warranty Part Item",
        filters={
            "parent": ["in", claims],
            "part_no": part_no
        },
        fields=["parent"]
    )

    if duplicate:
        return {
            "is_duplicate": True,
            "claims": list(set(d.parent for d in duplicate))
        }

    return {"is_duplicate": False}
