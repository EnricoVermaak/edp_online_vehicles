import frappe
import json
from frappe.utils import nowdate, getdate
@frappe.whitelist()
def service_type_query(doctype, txt, searchfield, start, page_len, filters):
    # Convert filters to dict if it is string
    if isinstance(filters, str):
        filters = json.loads(filters)

    service_schedule_filters = {}
    model_code = filters.get("model_code")
    if model_code:
        service_schedule_filters["model_code"] = model_code

    used_service_type_names = []
    vin_serial_no = str(filters.get("vin_serial_no")) if filters.get("vin_serial_no") else None


    if vin_serial_no:
        used_services = frappe.get_all(
            "Vehicles Service",
            filters={"vin_serial_no": vin_serial_no},
            fields=["service_type"]
        )
        used_service_type_names = [d["service_type"] for d in used_services]

    all_services = frappe.get_all(
        "Service Schedules",
        filters=service_schedule_filters,
        fields=["name","interval"]
    )

    # Format services as list of tuples (value, label)
    all_service_tuples = [(d['name'], f"{d['name']} - {d['interval']}") for d in all_services]

    # Only show services not already used
    available_services = [t for t in all_service_tuples if t[0] not in used_service_type_names]

    # Add Major/Minor services for model_code if not used
    if model_code:
        major_minor_services = [
            (f"SS-{model_code}-Major", f"SS-{model_code}-Major"),
            (f"SS-{model_code}-Minor", f"SS-{model_code}-Minor")
        ]
        for s in major_minor_services:
            if s[0] not in used_service_type_names and s not in available_services:
                available_services.append(s)

    return available_services








# @frappe.whitelist()
# def check_service_date(vin):
#     if not vin:
#         return {"is_valid": True}

#     vehicle = frappe.get_doc("Vehicle Stock", vin)

#     start = vehicle.service_start_date
#     end = vehicle.service_end_date
#     today = nowdate()

#     # If dates missing then allow
#     if not start or not end:
#         return {"is_valid": True}

#     # Convert to date objects
#     start_day = getdate(start).day
#     end_day = getdate(end).day
#     today_day = getdate(today).day

#     # Check only DAY range (ignore month + year)
#     if start_day <= today_day <= end_day:
#         return {"is_valid": True}

#     return {"is_valid": False}


@frappe.whitelist()
def check_service_date(vin):
    if not vin:
        return {"is_valid": True}

    vehicle = frappe.get_doc("Vehicle Stock", vin)

    start = vehicle.service_start_date
    end = vehicle.service_end_date
    today = nowdate()

    # If dates missing then allow
    if not start or not end:
        return {"is_valid": True}

    # Convert to date objects (full date comparison)
    start_date = getdate(start)
    end_date = getdate(end)
    today_date = getdate(today)

    # Full comparison: day + month + year
    if start_date <= today_date <= end_date:
        return {"is_valid": True}

    return {"is_valid": False}




@frappe.whitelist()
def check_warranty_date(vin):
    if not vin:
        return {"is_valid": True}

    vehicle = frappe.get_doc("Vehicle Stock", vin)

    start = vehicle.warranty_start_date
    end = vehicle.warranty_end_date
    today = nowdate()

    if not start or not end:
        return {"is_valid": True}

    start_date = getdate(start)
    end_date = getdate(end)
    today_date = getdate(today)

    if start_date <= today_date <= end_date:
        return {"is_valid": True}

    return {"is_valid": False}