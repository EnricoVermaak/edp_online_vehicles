import frappe
import json
from frappe.utils import nowdate, getdate

@frappe.whitelist()
def service_type_query(doctype, txt, searchfield, start, page_len, filters):
    # Initialize filters for Service Schedules
    service_schedule_filters = {}

    # Apply filters based on passed arguments
    if filters.get("model_code"):
        service_schedule_filters["model_code"] = filters.get("model_code")

    # Get the Vehicles VIN number/serial number from Vehicles Service if provided
    vin_serial_no = filters.get("vin_serial_no")
    if vin_serial_no:
        vehicles_service_filters = {"vin_serial_no": vin_serial_no}
        # Fetch the service types associated with the given Vehicles VIN number/serial number
        used_service_types_data = frappe.get_all(
            "Vehicles Service", filters=vehicles_service_filters, fields=["service_type"]
        )
        used_service_type_names = (
            [d["service_type"] for d in used_service_types_data] if used_service_types_data else []
        )
    else:
        used_service_type_names = []    

    # Get all service types from Service Schedules based on filters
    all_service_types = frappe.get_all(
        "Service Schedules", fields=["name", "interval"], filters=service_schedule_filters
    )

    odo_reading = 0
    if vin_serial_no:
        try:
            vehicle_stock = frappe.get_doc("Vehicle Stock", vin_serial_no)
            odo_reading = int(vehicle_stock.odo_reading or 0)
        except (ValueError, TypeError):
            odo_reading = 0  # Default to 0 if odo_reading is not a valid integer

    # Display the available service types from all service types
    available_service_types = []

    for row in all_service_types:
        schedule_name = row.get("name")
        interval_val = row.get("interval")

        if interval_val is None:
            is_numeric_interval = False
            service_interval = None
        else:
            try:
                service_interval = int(interval_val)
                is_numeric_interval = True
            except (ValueError, TypeError):
                service_interval = interval_val
                is_numeric_interval = False

        if is_numeric_interval:
            if schedule_name in used_service_type_names:
                continue
            if odo_reading <= service_interval:
                available_service_types.append([schedule_name])
        else:
            available_service_types.append([schedule_name])

    return available_service_types

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