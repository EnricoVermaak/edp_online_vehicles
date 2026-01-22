# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe


@frappe.whitelist()
def update_vehicle_aging():
    try:

        batch_size = 200
        updated_count = 0

        for start in range(0, batch_size):
            vehicles = frappe.get_all("Vehicle Stock",
                fields=["name", "ho_date_received", "model_conversion_date", "in_transit_date", "delivery_date", "availability_status"],
                filters={"availability_status": ["!=", "Sold"]},  # Skip sold vehicles
                limit_page_length=batch_size,
                limit_start=start
            )

            if not vehicles:
                break

            batch_updates = []
            for vehicle in vehicles:
                try:
                    # Calculate ages without loading full document
                    ages = calculate_vehicle_ages(vehicle)
                    batch_updates.append({
                        "name": vehicle.name,
                        "updates": ages
                    })
                    updated_count += 1

                except Exception as e:
                    print(f"Error calculating ages for vehicle {vehicle.name}: {str(e)}")

            for update in batch_updates:
                frappe.db.set_value("Vehicle Stock", update["name"], update["updates"], update_modified=False)

            frappe.db.commit()

    except Exception as e:
        # Silent error handling
        frappe.db.rollback()


def calculate_vehicle_ages(vehicle):
    from frappe.utils import getdate
    import datetime

    today = getdate()

    head_office_age = 0
    model_conversion_age = 0
    in_transit_age = 0
    dealer_age = 0
    total_age = 0

    # Total age: always from HO date received to today (if set)
    if vehicle.get("ho_date_received"):
        ho_date = getdate(vehicle["ho_date_received"])
        if ho_date <= today:
            total_age = (today - ho_date).days

    # Head Office Age: from HO date received until vehicle leaves head office (in-transit)
    if vehicle.get("ho_date_received"):
        ho_date = getdate(vehicle["ho_date_received"])
        end_date = today  # Default to today

        # Stop HO age when in-transit starts (vehicle leaves head office)
        if vehicle.get("in_transit_date"):
            transit_date = getdate(vehicle["in_transit_date"])
            if transit_date > ho_date:
                end_date = min(end_date, transit_date)

        if ho_date <= end_date:
            head_office_age = (end_date - ho_date).days

    # Model Conversion Age: from conversion date until vehicle leaves head office (in-transit)
    if vehicle.get("model_conversion_date"):
        conversion_date = getdate(vehicle["model_conversion_date"])
        end_date = today

        # Stop conversion age when in-transit starts (vehicle leaves head office)
        if vehicle.get("in_transit_date"):
            transit_date = getdate(vehicle["in_transit_date"])
            if transit_date > conversion_date:
                end_date = min(end_date, transit_date)

        if conversion_date <= end_date:
            model_conversion_age = (end_date - conversion_date).days

    # In Transit Age: from in-transit date until delivery
    if vehicle.get("in_transit_date"):
        transit_date = getdate(vehicle["in_transit_date"])
        end_date = today
        # Stop in-transit age when delivered
        if vehicle.get("delivery_date"):
            delivery_date = getdate(vehicle["delivery_date"])
            if delivery_date > transit_date:
                end_date = min(end_date, delivery_date)

        if transit_date <= end_date:
            in_transit_age = (end_date - transit_date).days

    # Dealer Age: from delivery date to today
    if vehicle.get("delivery_date"):
        delivery_date = getdate(vehicle["delivery_date"])
        if delivery_date <= today:
            dealer_age = (today - delivery_date).days

    return {
        "head_office_age": head_office_age,
        "model_conversion_age": model_conversion_age,
        "in_transit_age": in_transit_age,
        "dealer_age": dealer_age,
        "total_age": total_age
    }