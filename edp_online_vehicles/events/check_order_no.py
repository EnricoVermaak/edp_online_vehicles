import frappe


@frappe.whitelist()
def check_dealer_order_no(order_no, ordering_dealer):
	if frappe.db.exists("Vehicle Order", {"dealer_order_no": order_no, "dealer": ordering_dealer}):
		return "True"
	else:
		return "False"
