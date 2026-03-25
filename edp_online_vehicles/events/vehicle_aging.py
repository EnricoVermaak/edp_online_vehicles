# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe


@frappe.whitelist()
def update_vehicle_aging():
    try:
        batch_size = 500
        start = 0
        updated_count = 0

        while True:
            vehicles = frappe.get_all(
                "Vehicle Stock",
                fields=["name", "ho_date_received", "model_conversion_date",
                         "in_transit_date", "delivery_date"],
                filters={"availability_status": ["!=", "Sold"]},
                limit_page_length=batch_size,
                limit_start=start,
                order_by="name asc",
            )

            if not vehicles:
                break

            for vehicle in vehicles:
                try:
                    ages = calculate_vehicle_ages(vehicle)
                    frappe.db.set_value(
                        "Vehicle Stock", vehicle.name, ages,
                        update_modified=False,
                    )
                    updated_count += 1
                except Exception:
                    frappe.log_error(
                        f"Error calculating ages for {vehicle.name}",
                        "Vehicle Aging Update Error",
                    )

            frappe.db.commit()
            start += batch_size

        frappe.logger().info(f"Vehicle aging: updated {updated_count} records")

    except Exception as e:
        frappe.log_error(f"Vehicle aging batch failed: {e}", "Vehicle Aging Update Error")
        frappe.db.rollback()


def calculate_vehicle_ages(vehicle):
    from frappe.utils import getdate

    today = getdate()

    head_office_age = 0
    model_conversion_age = 0
    in_transit_age = 0
    dealer_age = 0
    total_age = 0

    ho_date = getdate(vehicle["ho_date_received"]) if vehicle.get("ho_date_received") else None
    transit_date = getdate(vehicle["in_transit_date"]) if vehicle.get("in_transit_date") else None
    delivery_date = getdate(vehicle["delivery_date"]) if vehicle.get("delivery_date") else None
    conversion_date = getdate(vehicle["model_conversion_date"]) if vehicle.get("model_conversion_date") else None


    # Total age: always from HO date received to today
    if ho_date and ho_date <= today:
        total_age = (today - ho_date).days

    # Head Office Age: from HO received until vehicle leaves HO.
    # Ends at in_transit_date if set, otherwise at delivery_date if set, otherwise today.
    if ho_date:
        end = today
        if transit_date and transit_date >= ho_date:
            end = min(end, transit_date)
        elif delivery_date and delivery_date >= ho_date:
            end = min(end, delivery_date)
        if ho_date <= end:
            head_office_age = (end - ho_date).days

    # Model Conversion Age: from conversion date until vehicle leaves HO (same end logic).
    if conversion_date:
        end = today
        if transit_date and transit_date >= conversion_date:
            end = min(end, transit_date)
        elif delivery_date and delivery_date >= conversion_date:
            end = min(end, delivery_date)
        if conversion_date <= end:
            model_conversion_age = (end - conversion_date).days

    # In Transit Age: from in-transit date until delivery
    if transit_date:
        end = today
        if delivery_date and delivery_date >= transit_date:
            end = min(end, delivery_date)
        if transit_date <= end:
            in_transit_age = (end - transit_date).days

    # Dealer Age: from delivery date to today
    if delivery_date and delivery_date <= today:
        dealer_age = (today - delivery_date).days

    return {
        "head_office_age": head_office_age,
        "model_conversion_age": model_conversion_age,
        "in_transit_age": in_transit_age,
        "dealer_age": dealer_age,
        "total_age": total_age,
    }