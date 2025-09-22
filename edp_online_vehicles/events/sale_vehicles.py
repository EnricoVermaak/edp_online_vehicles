import json

import frappe


@frappe.whitelist()
def vehicles_sale_status_change(items, status, customer):
	items = json.loads(items)

	if status == "Approved":
		for item in items:
			vinno = item.get("vin_serial_no")
			if vinno:
				equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
				if equip_doc:
					stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
					stock_doc.availability_status = "Sold"
					stock_doc.customer = customer
					stock_doc.save(ignore_permissions=True)
					frappe.db.commit()

		return "Vehicle Stock status updated"


@frappe.whitelist()
def vehicles_contract_status_change(items, status):
	items = json.loads(items)

	if status == "Active":
		for item in items:
			vinno = item.get("vin_serial_no")
			if vinno:
				equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
				if equip_doc:
					stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
					stock_doc.availability_status = "Active Contract"
					stock_doc.save(ignore_permissions=True)
					frappe.db.commit()

		return "Vehicle Stock status updated"
	elif status == "Expired":
		for item in items:
			vinno = item.get("vin_serial_no")
			if vinno:
				equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
				if equip_doc:
					stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
					stock_doc.availability_status = "Expired Contract"
					stock_doc.save(ignore_permissions=True)
					frappe.db.commit()

		return "Vehicle Stock status updated"


@frappe.whitelist()
def vehicles_order_status_change(items, status, dealer):
	items = json.loads(items)

	if status == "Completed":
		for item in items:
			vinno = item.get("vin_serial_no")
			if vinno:
				equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
				if equip_doc:
					stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
					stock_doc.availability_status = "Available"
					stock_doc.dealer = dealer
					stock_doc.save(ignore_permissions=True)
					frappe.db.commit()

		return "Vehicle Stock status updated"


@frappe.whitelist()
def reserve_vehicles_status_change(vinno, status):
	if status == "Available":
		if vinno:
			equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
			if equip_doc:
				stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
				stock_doc.availability_status = "Available"
				stock_doc.save(ignore_permissions=True)
				frappe.db.commit()

				return "Vehicle Stock status updated"
	elif status == "Reserved":
		if vinno:
			equip_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")
			if equip_doc:
				stock_doc = frappe.get_doc("Vehicle Stock", equip_doc)
				stock_doc.availability_status = "Reserved"
				stock_doc.save(ignore_permissions=True)
				frappe.db.commit()

				return "Vehicle Stock status updated"
