import frappe


@frappe.whitelist()
def submit_service_document(doc):
	service_doc = frappe.get_doc("Vehicles Service", doc)

	service_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_shipment_document(doc):
	shipment_doc = frappe.get_doc("Vehicles Shipment", doc)

	shipment_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_order_document(doc):
	order_doc = frappe.get_doc("Vehicle Order", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_hq_order_document(doc):
	order_doc = frappe.get_doc("Head Office Vehicle Orders", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_dealer_order_document(doc):
	order_doc = frappe.get_doc("Vehicles Dealer to Dealer Order", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_location_movement_document(doc):
	order_doc = frappe.get_doc("Vehicles Location Movement", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_dealer_sale_document(doc):
	order_doc = frappe.get_doc("Vehicle Retail", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_stock_recon_document(doc):
	order_doc = frappe.get_doc("Vehicles Recon", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_reserved_vehicles(doc):
	order_doc = frappe.get_doc("Reserved Vehicles", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_part_order(doc):
	order_doc = frappe.get_doc("Part Order", doc)

	order_doc.submit()

	return "Document Successfully submitted"


@frappe.whitelist()
def submit_part_shipment(doc):
	shipment_doc = frappe.get_doc("Part Shipment", doc)

	shipment_doc.submit()

	return "Document Successfully submitted"
