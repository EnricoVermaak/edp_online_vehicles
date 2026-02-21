from datetime import datetime, timedelta

import frappe
from frappe.utils import now_datetime
from edp_online_vehicles.edp_online_vehicles.doctype.head_office_vehicle_orders.head_office_vehicle_orders import _fire_on_vehicle_allocated



@frappe.whitelist()
def bulk_allocate_orders(docnames):
	docnames = frappe.parse_json(docnames)
	total_count = len(docnames)
	allocated_count = 0

	for docname in docnames:
		try:
			order_doc = frappe.get_doc("Head Office Vehicle Orders", docname)

			# Build colour identifier
			colour = f"{order_doc.colour} - {order_doc.model}"

			# Find oldest matching stock
			result = frappe.db.sql(
				"""
                SELECT
                    es.name,
                    es.vin_serial_no,
                    es.model,
                    es.colour,
                    es.description,
                    es.engine_no
                FROM
                    `tabVehicle Stock` es
                LEFT JOIN
                    `tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
                LEFT JOIN
                    `tabStock Entry` se ON se.name = sed.parent
                WHERE
                    se.stock_entry_type = 'Material Receipt'
                    AND es.model = %(model)s
                    AND es.colour = %(colour)s
                    AND es.availability_status = %(availability_status)s
                    AND es.dealer = %(dealer)s
                    AND NOT EXISTS (
                        SELECT 1
                        FROM `tabHead Office Vehicle Orders` ho
                        WHERE ho.vinserial_no = es.vin_serial_no
                    )
                    AND se.name IN (
                        SELECT MIN(se2.name)
                        FROM `tabStock Entry` se2
                        LEFT JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
                        WHERE se2.stock_entry_type = 'Material Receipt'
                        AND sed2.serial_no = es.vin_serial_no
                        GROUP BY sed2.serial_no
                    )
                ORDER BY
                    se.posting_date ASC,
                    se.posting_time ASC
                LIMIT 1
            """,
				{
					"model": order_doc.model,
					"colour": colour,
					"availability_status": "Available",
					"dealer": order_doc.order_placed_to,
				},
			)

			if result:
				vin_number = result[0][1]
				model = result[0][2]
				colour_full = result[0][3]
				description = result[0][4]
				engine_no = result[0][5]
				formatted_colour = colour_full.split(" - ")[0]

				# Allocate to order
				order_doc.vinserial_no = vin_number
				order_doc.model_delivered = model
				order_doc.model_description = description
				order_doc.colour_delivered = formatted_colour
				order_doc.engine_no = engine_no
				order_doc.status = "Processed"

				order_doc.save(ignore_permissions=True)

				# Verify save and criteria
				if order_doc.vinserial_no and order_doc.status == "Processed":
					allocated_count += 1

					# Update stock doc
					stock_doc = frappe.get_doc("Vehicle Stock", order_doc.vinserial_no)
					stock_doc.availability_status = "Reserved"
					stock_doc.hq_order_no = order_doc.name
					comment = f"Vehicle has been allocated to Head Office order: {order_doc.name}"
					stock_doc.add_comment("Comment", comment)
					stock_doc.save(ignore_permissions=True)

					# Create reservation record
					now = now_datetime()
					hours = (
						frappe.db.get_single_value("Vehicle Stock Settings", "maximum_reservation_time_hours")
						or 0
					)
					reserve_to = now + timedelta(hours=hours)
					reserve_doc = frappe.new_doc("Reserved Vehicles")
					reserve_doc.vin_serial_no = order_doc.vinserial_no
					reserve_doc.dealer = order_doc.order_placed_by
					reserve_doc.model = order_doc.model
					reserve_doc.status = "Reserved"
					reserve_doc.reserve_reason = "Order Pending"
					reserve_doc.reserve_from_date = now
					reserve_doc.reserve_to_date = reserve_to
					reserve_doc.insert(ignore_permissions=True)

				_fire_on_vehicle_allocated(
					order_doc.name, order_doc.vinserial_no, order_doc.model_delivered,
					order_doc.model_description, order_doc.colour_delivered, order_doc.order_placed_by,
				)

				# Update related Vehicle Order doc
				vehicle_order = frappe.get_doc("Vehicle Order", order_doc.order_no)
				row_id = int(order_doc.row_id)
				for item in vehicle_order.vehicles_basket:
					if item.idx == row_id:
						item.status = order_doc.status
						item.vin_serial_no = order_doc.vinserial_no or item.vin_serial_no
						item.price_excl = order_doc.price_excl or item.price_excl
				vehicle_order.save(ignore_permissions=True)

					# Vehicle Tracking
					tracking_doc = frappe.new_doc("Vehicle Tracking")
					tracking_date_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
					tracking_doc.vin_serial_no = vin_number
					tracking_doc.action_summary = "Vehicle Allocated to Order"
					tracking_doc.request_datetime = tracking_date_time
					tracking_doc.request = f"VIN/Serial No {vin_number} allocated on Order {order_doc.name} to Dealer {order_doc.order_placed_by}"
					tracking_doc.insert(ignore_permissions=True)

			frappe.db.commit()

		except Exception as e:
			frappe.logger().error(f"Error processing {docname}: {e!s}")

	# Final summary message
	frappe.msgprint(f"{allocated_count} out of {total_count} orders successfully allocated.")
