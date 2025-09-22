from datetime import datetime

import frappe


@frappe.whitelist()
def create_tracking_doc(vinno, retail_doc_name):
	retail_doc = frappe.get_doc("Vehicle Retail", retail_doc_name)
	retail_doc.retail_date = datetime.now()
	retail_doc.save()

	for vin in vinno:
		tracking_doc = frappe.new_doc("Vehicle Tracking")

		tracking_doc.vin_serial_no = vin
		tracking_doc.status = "Pending"
		tracking_doc.action_summary = "eNatis Release"
		tracking_doc.type = "EDP Online"
		tracking_doc.request_datetime = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
		tracking_doc.request = f"eNatis Release requested by {frappe.session.user}"

		tracking_doc.insert(ignore_permissions=True)
		tracking_doc.submit()

	frappe.db.commit()
