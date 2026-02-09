
import frappe


def execute():
	frappe.db.sql("""
		UPDATE `tabVehicle Stock`
		SET control_no = certificate_number
		WHERE certificate_number IS NOT NULL
		AND TRIM(IFNULL(certificate_number, '')) != ''
	""")
	frappe.db.commit()
