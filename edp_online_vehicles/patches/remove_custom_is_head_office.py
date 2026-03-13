
import frappe


def execute():
	name = "Company-custom_is_head_office"

	if frappe.db.exists("Custom Field", name):
		try:
			frappe.delete_doc("Custom Field", name, force=1, ignore_permissions=1)
		except Exception:
			frappe.db.delete("Custom Field", {"name": name})
			frappe.db.commit()

	if frappe.db.has_column("Company", "custom_is_head_office"):
		try:
			frappe.db.sql("ALTER TABLE `tabCompany` DROP COLUMN `custom_is_head_office`")
		except Exception:
			pass

	frappe.db.delete("Property Setter", {"doc_type": "Company", "field_name": "custom_is_head_office"})
	frappe.db.commit()
	frappe.clear_cache(doctype="Company")
