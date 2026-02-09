
import frappe


def execute():
	frappe.db.sql("""
		UPDATE `tabVehicle Stock`
		SET `range` = series
		WHERE series IS NOT NULL
		AND TRIM(IFNULL(series, '')) != ''
	""")
	frappe.db.commit()
