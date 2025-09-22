import frappe


@frappe.whitelist()
def create_vehicle(vinno, colour, license_no, license_expiry_date, engine_no, veh_reg_no, brand):
	try:
		stock_doc = frappe.new_doc("Vehicle Stock")

		stock_doc.vin_serial_no = vinno
		stock_doc.brand = brand
		stock_doc.colour = colour
		stock_doc.engine_no = engine_no

		stock_doc.insert(ignore_permissions=True)
		frappe.db.commit()

		return True
	except Exception:
		frappe.log_error(title="create_vehicle failed", message=frappe.get_traceback())

		return False
