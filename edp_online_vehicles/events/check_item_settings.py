import frappe


@frappe.whitelist()
def check_item_settings(doc, method=None):
	return
	# if doc.item_group == "Vehicles":
	#     if doc.is_sales_item == 0:
	#         doc.is_sales_item = 1

	#     if doc.is_stock_item == 0:
	#         doc.is_stock_item = 1

	#     doc.save(ignore_permissions=True)
	# else:
	#     return
