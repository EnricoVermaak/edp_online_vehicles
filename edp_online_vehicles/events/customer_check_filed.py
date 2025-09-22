import frappe


def update_vehicles_services(doc, method=None):
	prices_for_vehicles_service = doc.custom__show_prices_for_vehicles_service
	price_for_request_for_service = doc.custom_show_price_for_request_for_service

	rfs_docs = frappe.get_all("Request for Service", filters={"customer": doc.name}, fields=["name"])

	vehicles_docs = frappe.get_all("Vehicles Service", filters={"customer": doc.name}, fields=["name"])

	for eq_doc in vehicles_docs:
		vehicles_service_doc = frappe.get_doc("Vehicles Service", eq_doc["name"])
		vehicles_service_doc.db_set("show_prices_for_vehicles_service", prices_for_vehicles_service)

	for rfs_doc in rfs_docs:
		rfs_service_doc = frappe.get_doc("Request for Service", rfs_doc["name"])
		rfs_service_doc.db_set("show_price_for_request_for_service", price_for_request_for_service)
	frappe.db.commit()
