# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe


@frappe.whitelist()
def update_vehicle_aging():
    try:
        vehicles = frappe.get_all("Vehicle Stock",
            fields=["name", "ho_date_received", "model_conversion_date", "in_transit_date", "delivery_date"]
        )

        updated_count = 0
        for vehicle in vehicles:
            doc = frappe.get_doc("Vehicle Stock", vehicle.name)
            doc.calculate_vehicle_aging()
            doc.check_and_set_model_conversion_date()

            # Update the age fields in database
            frappe.db.set_value("Vehicle Stock", vehicle.name, {
                "head_office_age": doc.head_office_age,
                "model_conversion_age": doc.model_conversion_age,
                "in_transit_age": doc.in_transit_age,
                "dealer_age": doc.dealer_age,
                "total_age": doc.total_age
            }, update_modified=False)

            updated_count += 1

        frappe.db.commit()
        frappe.logger().info(f"Updated aging counters for {updated_count} vehicles")

    except Exception as e:
        frappe.log_error(f"Error updating vehicle aging: {str(e)}", "Vehicle Aging Update Error")
        frappe.db.rollback()