import frappe


@frappe.whitelist()
def set_default_warehouse(doc, method=None):
	default_warehouse = "Stores - " + doc.abbr

	warehouse_exists = frappe.db.exists("Warehouse", {"name": default_warehouse})

	if warehouse_exists:
		doc.custom_default_vehicles_stock_warehouse = default_warehouse

		frappe.msgprint(doc.custom_default_vehicles_stock_warehouse)

		doc.save(ignore_permissions=True)
		frappe.db.commit()
	else:
		return
