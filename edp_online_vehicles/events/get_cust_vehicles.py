import frappe


@frappe.whitelist()
def get_vehicles_linked_to_dealer_cust(docname):
	dealer_cust_doc = frappe.get_doc("Dealer Customer", docname)

	if dealer_cust_doc:
		cust_vehicle_list = frappe.get_all(
			"Vehicle Stock",
			filters={"customer": docname},
			fields=["name", "description", "colour", "warranty_end_date", "service_end_date", "retail_date"],
		)

		return cust_vehicle_list
	else:
		return []
