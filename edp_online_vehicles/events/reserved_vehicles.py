import frappe
from frappe.utils import now_datetime, nowdate


@frappe.whitelist()
def update_reserved_vehicles_status():
	today = nowdate()
	reserved_Vehicles = frappe.get_all(
		"Reserved Vehicles", filters={"status": "Reserved", "reserve_to_date": today}, fields=["name"]
	)
	print(reserved_Vehicles)
	for equip in reserved_Vehicles:
		equip_doc = frappe.get_doc("Reserved Vehicles", equip["name"])
		equip_doc.status = "Available"
		equip_doc.save(ignore_permissions=True)
		equip_doc.submit(ignore_permissions=True)

		vinno = equip_doc.vin_serial_no

		veh_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")

		if veh_doc:
			stock_doc = frappe.get_doc("Vehicle Stock", veh_doc)
			stock_doc.availability_status = "Available"
			stock_doc.save(ignore_permissions=True)

	frappe.db.commit()


@frappe.whitelist()
def update_stock(vinno, message, status):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno)

	stock_doc.add_comment("Comment", message)
	stock_doc.availability_status = status

	stock_doc.save(ignore_permissions=True)

	if frappe.db.exists("Reserved Vehicles", {"vin_serial_no": vinno}):
		add_reserved_comment(vinno, message)

	frappe.db.commit()


@frappe.whitelist()
def add_reserved_comment(vinno, message):
	reserve_doc = frappe.get_doc("Reserved Vehicles", {"vin_serial_no": vinno})

	reserve_doc.add_comment("Comment", message)

	reserve_doc.save(ignore_permissions=True)


@frappe.whitelist()
def check_reserved_ordered_vehicles():
	today = now_datetime()

	reserved_Vehicles = frappe.get_all(
		"Reserved Vehicles",
		filters={"status": "Reserved", "reserve_to_date": ["<=", today], "reserve_reason": "Order Pending"},
		fields=["name"],
	)
	for equip in reserved_Vehicles:
		equip_doc = frappe.get_doc("Reserved Vehicles", equip["name"])
		equip_doc.status = "Available"
		equip_doc.save(ignore_permissions=True)
		equip_doc.submit(ignore_permissions=True)

		vinno = equip_doc.vin_serial_no

		veh_doc = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "name")

		if veh_doc and veh_doc.availability_status == "Reserved":
			stock_doc = frappe.get_doc("Vehicle Stock", veh_doc)
			stock_doc.availability_status = "Available"
			stock_doc.save(ignore_permissions=True)


# @frappe.whitelist()
# def update_stock(vinno, message, status):
#     stock_doc = frappe.get_doc('Vehicle Stock', vinno)
#     stock_doc.flags.ignore_permissions = True  # Ensure permission override

#     stock_doc.add_comment("Comment", message)
#     stock_doc.availability_status = status
#     stock_doc.save(ignore_permissions=True)

#     # Fetch reserved vehicle records correctly
#     reserve_docs = frappe.get_list('Reserved Vehicles', filters={'vin_serial_no': vinno}, pluck='name')
#     if reserve_docs:
#         reserve_doc = frappe.get_doc('Reserved Vehicles', reserve_docs[0])
#         reserve_doc.flags.ignore_permissions = True  # Ensure permission override

#         reserve_doc.add_comment("Comment", message)
#         reserve_doc.save(ignore_permissions=True)

#     frappe.db.commit()
