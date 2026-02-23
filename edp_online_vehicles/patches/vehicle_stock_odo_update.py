import frappe


def execute():
    print("=" * 80)
    print("Updating vehicle stock odo values to match latest service, booking, or claim records...")
    print("=" * 80)

    try:
        # Get all Vehicle Stock records
        vehicles = frappe.get_all(
            "Vehicle Stock",
            fields=["name", "odo_reading"]
        )

        for vehicle in vehicles:
            vin = vehicle.name

            # Get latest service by highest odo_reading_hours
            latest_service = frappe.get_all(
                "Vehicles Service",
                filters={"vin_serial_no": vin},
                fields=["odo_reading_hours"],
                order_by="odo_reading_hours desc",
                limit=1
            )

            # Get latest service booking by highest odo_reading_hours
            latest_booking = frappe.get_all(
                "Vehicle Service Booking",
                filters={"vin_serial_no": vin},
                fields=["odo_reading_hours"],
                order_by="odo_reading_hours desc",
                limit=1
            )

            # Get latest warranty claim by highest odo_reading
            latest_claim = frappe.get_all(
                "Vehicles Warranty Claims",
                filters={"vin_serial_no": vin},
                fields=["odo_reading"],
                order_by="odo_reading desc",
                limit=1
            )

            # Determine the highest odo reading among service, booking, and claim and update Vehicle Stock
            max_odo = max(
                latest_service[0].odo_reading_hours if latest_service else 0,
                latest_booking[0].odo_reading_hours if latest_booking else 0,
                latest_claim[0].odo_reading if latest_claim else 0
            )

            # Convert Vehicle Stock odo_reading to int for comparison, default to 0 if None or invalid
            try:
                vehicle_odo = int(vehicle.odo_reading)
            except (ValueError, TypeError):
                vehicle_odo = 0

            if max_odo > vehicle_odo:
                print(f"  Updating {vin}: ODO {vehicle.odo_reading} -> {max_odo}")
                frappe.db.set_value("Vehicle Stock", vin, "odo_reading", max_odo)

        frappe.db.commit()

        print("\n  [SUCCESS] Vehicle stock odo values updated successfully")

    except Exception as e:
        error_msg = f"Failed to update vehicle stock odo values: {str(e)}"
        print(f"  [ERROR] {error_msg}")
        frappe.log_error(error_msg, "Vehicle Stock ODO Update Patch")

    print("\n" + "=" * 80)
    print("Vehicle Stock ODO Update Patch Complete!")
    print("=" * 80)