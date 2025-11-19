import frappe

@frappe.whitelist()
def service_type_query(doctype, txt, searchfield, start, page_len, filters):
    # Step 1: Filter for Service Schedules based on model_code
    service_schedule_filters = {}
    model_code = filters.get("model_code")
    if model_code:
        service_schedule_filters["model_code"] = model_code

    # Step 2: Get already used service types for the given VIN
    used_service_type_names = []
    vin_serial_no = str(filters.get("vin_serial_no")) if filters.get("vin_serial_no") else None

    if vin_serial_no:
        used_services = frappe.get_all(
            "Vehicles Service",
            filters={"vin_serial_no": vin_serial_no},
            fields=["service_type"]
        )
        used_service_type_names = [d["service_type"] for d in used_services]

    # Step 3: Get all service types for the model
    all_services = frappe.get_all(
        "Service Schedules",
        filters=service_schedule_filters,
        fields=["name"]
    )
    all_service_names = [d["name"] for d in all_services]

    # Step 4: Filter out already used service types
    available_services = [[name] for name in all_service_names if name not in used_service_type_names]

    # Step 5: Add Major/Minor services
    if model_code:
        major_minor_services = [f"SS-{model_code}-Major", f"SS-{model_code}-Minor"]
        for s in major_minor_services:
            if s not in used_service_type_names and [s] not in available_services:
                available_services.append([s])

    return available_services
