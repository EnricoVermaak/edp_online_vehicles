import frappe
from frappe.utils import get_link_to_form
import re

@frappe.whitelist()
def create_service_from_booking(booking_name):
    """
    Create Vehicle Service from Booking
    Add tag if Odo Reading is missing
    """

    try:
        booking = frappe.get_doc("Vehicle Service Booking", booking_name)

        if not booking.customer:
            frappe.throw("Please select a Customer before creating a new job.")

        if not booking.dealer:
            frappe.throw("Please select a Dealer before creating a new job.")

        if not booking.service_type:
            frappe.throw("Please specify a service type before creating a new job.")


        existing_service = frappe.db.get_value(
            "Vehicles Service",
            {"booking_name": booking.name},
            "name"
        )
        if existing_service:
            service = frappe.get_doc("Vehicles Service", existing_service)

            if getattr(booking, "odo_reading_hours", None):
                service.db_set("odo_reading_hours", booking.odo_reading_hours)
                service.remove_tag("Odo Reading Missing")

            return service.name

        service = frappe.get_doc({
            "doctype": "Vehicles Service",
            "requested_booking_date_time": booking.requested_booking_date_time,
            "dealer": booking.dealer,
            "service_type": booking.service_type,
            "service_status": booking.status,
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

        if not getattr(booking, "odo_reading_hours", None):
            service.add_tag("Odo Reading Missing")


        link = get_link_to_form("Vehicles Service", service.name)
        frappe.msgprint(
            f"✅ Vehicle Service created: {link}",
            title="Success"
        )

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
