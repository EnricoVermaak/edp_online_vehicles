import frappe


@frappe.whitelist()
def update_stock_no(stockNo):
	setting_doc = frappe.get_doc("Vehicle Stock Settings")

	setting_doc.last_automated_stock_no = stockNo

	setting_doc.save(ignore_permissions=True)
	frappe.db.commit()
