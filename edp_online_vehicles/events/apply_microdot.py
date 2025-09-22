from datetime import datetime

import frappe


@frappe.whitelist()
def apply_microdot(vinno, microdot, microdot_fitted_by, date_applied, old_microdot=None):
	if old_microdot:
		update_microdot(old_microdot, "", "", "Received")

	update_microdot(microdot, vinno, date_applied, "Used")

	update_stock(vinno, microdot, microdot_fitted_by)

	frappe.db.commit()

	return "Microdot applied to vehicle. (VIN: " + vinno + ")"


@frappe.whitelist()
def check_microdot_assigned(vinno):
	microdot = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "microdot")

	if microdot:
		frappe.msgprint(
			"Warning: This vehicle already has a microdot assigned. Proceeding will overwrite the existing one."
		)
		return microdot
	else:
		return ""


@frappe.whitelist()
def check_microdot_status(microdot):
	status = frappe.get_value("Vehicles Microdots", {"microdot": microdot}, "status")

	return status


@frappe.whitelist()
def test_new_stock_microdot(vinno, microdot, dealer, microdot_fitted_by):
	old_microdot = frappe.get_value("Vehicle Stock", {"vin_serial_no": vinno}, "microdot")
	date_applied = datetime.now()

	if not microdot == "false":
		if old_microdot != microdot:
			update_microdot(microdot, vinno, date_applied, "Used")
			add_microdot(vinno, microdot, dealer, microdot_fitted_by, date_applied, old_microdot)

			if old_microdot:
				frappe.delete_doc("Apply Vehicles Microdot", old_microdot)
				update_microdot(old_microdot, "", "", "Received")

	elif old_microdot:
		frappe.delete_doc("Apply Vehicles Microdot", old_microdot)
		update_microdot(old_microdot, "", "", "Received")


@frappe.whitelist()
def update_microdot(microdot, vinno, date_applied, status):
	microdot_doc = frappe.get_doc("Vehicles Microdots", microdot)

	microdot_doc.vin_serial_no = vinno
	microdot_doc.status = status
	microdot_doc.date_applied = date_applied
	microdot_doc.add_comment("Comment", f"Microdot {microdot} has been updated to Vehicle {vinno}")

	microdot_doc.save(ignore_permissions=True)

	frappe.set_value("Vehicles Microdots", microdot, "is_updated", 1)

	comment = f"Microdot {microdot} has been updated to Vehicle {vinno}"

	stock_doc = frappe.get_doc("Vehicle Stock", vinno)

	stock_doc.add_comment("Comment", comment)

	# stock_doc.save()


@frappe.whitelist()
def update_stock(vinno, microdot, microdot_fitted_by):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno)

	stock_doc.microdot = microdot
	stock_doc.microdot_fitted_by = microdot_fitted_by

	stock_doc.save(ignore_permissions=True)


@frappe.whitelist()
def add_microdot(vinno, microdot, dealer, microdot_fitted_by, date_applied, old_microdot=None):
	doc = frappe.new_doc("Apply Vehicles Microdot")

	doc.dealer = dealer
	doc.microdot = microdot
	doc.vin_serial_no = vinno
	doc.microdot_fitted_by = microdot_fitted_by
	doc.date_applied = date_applied

	doc.insert(ignore_permissions=True)
	doc.save(ignore_permissions=True)

	if old_microdot:
		frappe.delete_doc("Apply Vehicles Microdot", old_microdot)

	frappe.db.commit


@frappe.whitelist()
def test_new_apply_microdot(vinno, microdot, microdot_fitted_by):
	old_vinno = frappe.get_value("Apply Vehicles Microdot", {"microdot": microdot}, "vin_serial_no")

	frappe.msgprint(f"old: {old_vinno}")

	if not old_vinno == vinno:
		date_applied = datetime.now()

		if microdot:
			update_microdot(microdot, vinno, date_applied, "Used")
			update_stock(vinno, microdot, microdot_fitted_by)

		frappe.msgprint(f"old: {old_vinno}")
		if old_vinno:
			update_stock(old_vinno, "", "")

		return True

	return False


@frappe.whitelist()
def test_for_changes(vinno, microdot, microdot_fitted_by, date_applied):
	if not test_new_apply_microdot(vinno, microdot, microdot_fitted_by):
		test_new_details(microdot, date_applied, vinno, microdot_fitted_by)


@frappe.whitelist()
def test_new_details(microdot, date_applied, vinno, microdot_fitted_by):
	microdot_doc = frappe.get_doc("Apply Vehicles Microdot", microdot)

	old_date_applied = microdot_doc.date_applied
	old_microdot_fitted_by = microdot_doc.microdot_fitted_by

	if not old_date_applied == date_applied:
		update_stock(vinno, microdot, microdot_fitted_by)
		update_microdot(microdot, vinno, date_applied, "Used")

	if not old_microdot_fitted_by == microdot_fitted_by:
		update_stock(vinno, microdot, microdot_fitted_by)
		update_microdot(microdot, vinno, date_applied, "Used")


# old_vinno = frappe.get_value('Apply Vehicles Microdot', {'microdot' : microdot}, 'vin_serial_no')

#     if not old_vinno == vinno:

#         date_applied = datetime.now()

#         if microdot:
#             update_microdot(microdot, vinno, date_applied, 'Used')
#             update_stock(vinno, microdot, microdot_fitted_by)

#         if old_vinno:
#             update_stock(old_vinno, '', '')

#         return True

#     return False
