import base64
import csv
import io
import json
import os
import traceback
from datetime import datetime, timedelta

import frappe

from edp_online_vehicles.edp_online_vehicles.doctype.head_office_vehicle_orders.head_office_vehicle_orders import _fire_on_vehicle_allocated


# File paths under sites/<sitename>/public/files for write access
ERROR_DIR = frappe.get_site_path("public", "files", "HQ Order Bulk Allocation Errors")
MISSING_FILE = os.path.join(ERROR_DIR, "missing_orders.txt")
RESERVED_FILE = os.path.join(ERROR_DIR, "reserved_errors.txt")


@frappe.whitelist(allow_guest=False)
def allocate_vins_to_orders(dataurl=None, allocate_reserved=False, reserved_vins=None, reserved_map=None):
	# --- Coerce incoming parameters ---
	if isinstance(allocate_reserved, str):
		allocate_reserved = allocate_reserved.lower() in ("1", "true", "yes")
	if isinstance(reserved_vins, str):
		try:
			reserved_vins = json.loads(reserved_vins)
		except json.JSONDecodeError as e:
			frappe.log_error(
				title="Failed to parse reserved_vins JSON",
				message=str(e),
			)

			reserved_vins = []
	if isinstance(reserved_map, str):
		try:
			reserved_map = json.loads(reserved_map)
		except json.JSONDecodeError as e:
			frappe.log_error(
				title="Failed to parse reserved_vins JSON",
				message=str(e),
			)

			reserved_map = {}

	os.makedirs(ERROR_DIR, exist_ok=True)

	# --- RESERVED-ONLY PASS ---
	if allocate_reserved:
		return _allocate_reserved_only(reserved_vins, reserved_map)

	# --- FIRST PASS: Parse CSV, allocate non-reserved, collect reserved ---
	# Decode Base64 CSV
	header, b64 = dataurl.split(",", 1)
	raw_bytes = base64.b64decode(b64)
	raw = frappe.safe_decode(raw_bytes)

	reader = csv.reader(io.StringIO(raw))
	next(reader, None)  # skip header row

	total = success = 0
	reserved_list = []
	reserved_map = {}
	mismatched_list = []
	assigned_list = []
	assigned_map = {}

	# Reset missing-orders log
	with open(MISSING_FILE, "w") as f:
		f.write("Missing Orders:\n")

	for row in reader:
		total += 1
		if len(row) < 2:
			continue
		order_no, vin = row[0].strip(), row[1].strip()
		if not (order_no and vin):
			continue

		# 1) Missing order?
		if not frappe.db.exists("Head Office Vehicle Orders", order_no):
			with open(MISSING_FILE, "a") as f:
				f.write(f"{order_no}\n")
			continue

		# 2) Already assigned?
		# Find the latest Head Office Vehicle Orders for this VIN where status != 'Cancelled'
		existing = frappe.db.sql(
			"""
            SELECT name
              FROM `tabHead Office Vehicle Orders`
             WHERE vinserial_no = %s
               AND status != 'Cancelled'
             ORDER BY modified DESC
             LIMIT 1
        """,
			vin,
		)
		if existing:
			assigned_list.append(vin)
			assigned_map[vin] = existing[0][0]
			continue

		# 3) VIN in stock?
		stock = frappe.get_doc("Vehicle Stock", vin)
		if not stock:
			continue

		# 4) Model-mismatch?
		order_model = frappe.db.get_value("Head Office Vehicle Orders", order_no, "model")
		if stock.model != order_model:
			mismatched_list.append(vin)
			# skip allocation/reservation
			continue

		# 5) Reserved?
		if stock.availability_status == "Reserved":
			reserved_list.append(vin)
			reserved_map[vin] = order_no
			continue

		# 6) Assign now
		if _assign_vin_with_details(order_no, stock):
			success += 1

	return {
		"success_count": success,
		"total_count": total,
		"reserved_vins": reserved_list,
		"reserved_map": reserved_map,
		"mismatched_vins": mismatched_list,
		"assigned_vins": assigned_list,
		"assigned_map": assigned_map,
	}


def _assign_vin_with_details(order_no, stock_doc):
	"""
	Given an order name and a Vehicle Stock document, extract all needed fields,
	update the order and related records, and commit each step.
	"""
	try:
		vin_number = stock_doc.vin_serial_no
		model = stock_doc.model
		colour_full = stock_doc.colour
		description = stock_doc.description
		engine_no = stock_doc.engine_no
		formatted_colour = colour_full.split(" - ")[0]

		order_doc = frappe.get_doc("Head Office Vehicle Orders", order_no)
		order_doc.vinserial_no = vin_number
		order_doc.model_delivered = model
		order_doc.model_description = description
		order_doc.colour_delivered = formatted_colour
		order_doc.engine_no = engine_no
		order_doc.status = "Processed"
		order_doc.save(ignore_permissions=True)

		stock_doc.availability_status = "Reserved"
		stock_doc.hq_order_no = order_no
		stock_doc.add_comment("Comment", f"Vehicle allocated to Head Office order: {order_no}")
		stock_doc.save(ignore_permissions=True)

		now = datetime.now()
		hrs = frappe.db.get_single_value("Vehicle Stock Settings", "maximum_reservation_time_hours") or 0
		reserve_to = now + timedelta(hours=hrs)
		rv = frappe.new_doc("Reserved Vehicles")
		rv.vin_serial_no = vin_number
		rv.dealer = order_doc.order_placed_by
		rv.model = order_doc.model
		rv.status = "Reserved"
		rv.reserve_reason = "Order Pending"
		rv.reserve_from_date = now
		rv.reserve_to_date = reserve_to
		rv.insert(ignore_permissions=True)

		_fire_on_vehicle_allocated(
			order_doc.name, vin_number, order_doc.model_delivered,
			order_doc.model_description, order_doc.colour_delivered, order_doc.order_placed_by,
		)

		or_order_doc = frappe.get_doc("Vehicle Order", order_doc.order_no)

		row_id = int(order_doc.row_id)

		for item in or_order_doc.vehicles_basket:
			if item.idx == row_id:
				item.status = order_doc.status

				if order_doc.vinserial_no:
					item.vin_serial_no = order_doc.vinserial_no

				if order_doc.price_excl:
					item.price_excl = order_doc.price_excl

				or_order_doc.save(ignore_permissions=True)

		vt = frappe.new_doc("Vehicle Tracking")
		vt.vin_serial_no = vin_number
		vt.action_summary = "Vehicle Allocated to Order"
		vt.request_datetime = now.strftime("%Y-%m-%d %H:%M:%S")
		vt.request = f"VIN/Serial No {vin_number} allocated on Order {order_doc.name} to Dealer {order_doc.order_placed_by}"
		vt.insert(ignore_permissions=True)

		frappe.db.commit()
		return True

	except Exception:
		with open(RESERVED_FILE, "a") as f:
			f.write(f"Error allocating VIN {stock_doc.vin_serial_no} to order {order_no}\n")
			f.write(traceback.format_exc() + "\n")
		frappe.log_error(frappe.get_traceback(), f"Allocation error: {order_no} / {stock_doc.vin_serial_no}")
		return False


def _allocate_reserved_only(reserved_vins, reserved_map):
	"""Process only the reserved VINs after user confirmation."""
	reserved_success = 0

	with open(RESERVED_FILE, "w") as f:
		f.write("Reserved Allocation Errors:\n")

	for vin in reserved_vins or []:
		order_no = reserved_map.get(vin)
		if not order_no:
			continue

		try:
			stock_doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vin})
		except Exception:
			with open(RESERVED_FILE, "a") as f:
				f.write(f"Stock lookup failed for reserved VIN {vin}\n")
			continue

		if _assign_vin_with_details(order_no, stock_doc):
			reserved_success += 1

	return {"reserved_success_count": reserved_success}
