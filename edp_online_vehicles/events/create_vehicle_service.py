import frappe
from frappe.utils import get_link_to_form
import re

@frappe.whitelist()
def find_and_link_open_booking(vin_serial_no, current_service_name=None):

    if not vin_serial_no:
        return {"found": False}
    
    # Only Pending = open for linking
    open_statuses = ["Pending"]
    
    # Find open bookings for this VIN (most recent first)
    bookings = frappe.get_all(
        "Vehicle Service Booking",
        filters={
            "vin_serial_no": vin_serial_no,
            "status": ["in", open_statuses]
        },
        fields=["name", "status", "requested_booking_date_time", "dealer", "service_type",
                "vin_serial_no", "model", "engine_no", "odo_reading_hours", "customer",
                "customer_full_name", "mobile", "service_notes"],
        order_by="creation desc",
        limit_page_length=1
    )
    
    if not bookings:
        return {"found": False}
    
    booking = bookings[0]
    
    # Must have no linked service (exclude cancelled services)
    cur = (current_service_name or "").strip()
    existing = frappe.db.sql("""
        SELECT name FROM `tabVehicles Service`
        WHERE booking_name = %s AND docstatus != 2
        AND (name != %s OR %s = '')
        LIMIT 1
    """, (booking.name, cur, cur))
    if existing:
        return {"found": False, "reason": "Booking already linked to another service"}
    
    # Only return link and service_type; no other fields or parts/labour
    return {
        "found": True,
        "booking_name": booking.name,
        "service_type": booking.service_type,
    }

@frappe.whitelist()
def create_service_from_booking(booking_name):
    try:
        booking = frappe.get_doc("Vehicle Service Booking", booking_name)

        if not booking.customer:
            frappe.throw("Please select a Customer before creating a new job.")

        if not booking.dealer:
            frappe.throw("Please select a Dealer before creating a new job.")

        if not booking.service_type:
            frappe.throw("Please specify a service type before creating a new job.")

        # Check for existing service using SQL directly to bypass any cache
        existing_service = frappe.db.sql("""
            SELECT name FROM `tabVehicles Service` 
            WHERE booking_name = %s AND docstatus IN (0, 1)
            LIMIT 1
        """, (booking.name,), as_dict=True)
        
        if existing_service and len(existing_service) > 0:
            service_name = existing_service[0].name
            service = frappe.get_doc("Vehicles Service", service_name)

            if getattr(booking, "odo_reading_hours", None):
                service.db_set("odo_reading_hours", booking.odo_reading_hours)
                service.remove_tag("Odo Reading Missing")

            frappe.msgprint(
                f"Vehicles Service already exists: {service.name}",
                title="Service Already Exists"
            )
            return service.name
        
        # No existing service - create new one

        service = frappe.get_doc({
            "doctype": "Vehicles Service",
            "requested_booking_date_time": booking.requested_booking_date_time,
            "dealer": booking.dealer,
            "service_type": booking.service_type,
            "service_status": booking.status,
            "system_status": getattr(booking, "system_status", None),
            "vin_serial_no": booking.vin_serial_no,
            "model": booking.model,
            "engine_no": booking.engine_no,
            "odo_reading_hours": getattr(booking, "odo_reading_hours", None),
            "customer": booking.customer,
            "customer_name": booking.customer_full_name,
            "mobile": booking.mobile,
            "terms_and_conditions": booking.service_notes,
            "booking_name": booking.name
        })

        booking_job_card_no = getattr(booking, "job_card_no", None)

        if not booking_job_card_no:
            settings = frappe.get_doc("Vehicle Service Settings")

            if settings.allow_auto_job_card_no:
                last_job_no = settings.last_auto_job_card_no or "000000"
                prefix = settings.auto_job_card_no_prefix or ""

                match = re.search(r"\d+", last_job_no)
                number = int(match.group(0)) if match else 0

                next_job_no = prefix + str(number + 1).zfill(6)

                service.job_card_no = next_job_no
                settings.last_auto_job_card_no = next_job_no
                settings.save(ignore_permissions=True)
        else:
            service.job_card_no = booking_job_card_no

        for row in booking.table_jwkk:
            service.append("service_parts_items", {
                "item": row.item,
                "description": row.description,
                "qty": row.qty,
                "price_excl": row.price_excl,
                "total_excl": row.total_excl,
                "non_oem": row.non_oem,
                "descrip": row.descrip,
            })

        for row in booking.table_ottr:
            service.append("service_labour_items", {
                "item": row.item,
                "description": row.description,
                "duration_hours": row.duration_hours,
                "rate_hour": row.rate_hour,
                "total_excl": row.total_excl,
                "non_oem": row.non_oem,
                "non_oem_description": row.non_oem_description,
            })


        service.insert(ignore_permissions=True)
        # Note: Tag handling is done automatically in VehiclesService.on_update

        # Update booking status to Arrived when service is created
        booking.db_set("status", "Arrived", update_modified=False)
        
        frappe.db.commit()

        return service.name

    except frappe.ValidationError:
        # Field-based error already shown
        raise

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Create Service From Booking Error"
        )
        frappe.throw("Something went wrong while creating Vehicle Service.")
