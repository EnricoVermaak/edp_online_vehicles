import json

import frappe


@frappe.whitelist()
def get_visible_HQ_warehouses():
	com_name = frappe.db.get_value("Company", {"custom_head_office": 1}, ["name"], as_dict=1)

	return frappe.get_all(
		"Warehouse",
		filters={"custom_visible_for_vehicles_orders": 1, "company": com_name.name},
		fields=["name", "company"],
	)


@frappe.whitelist()
def get_visible_Dealer_warehouses():
	"""Fetch Dealer warehouses that are visible for Vehicles orders."""
	com_name = frappe.db.get_value("Company", {"custom_head_office": 1}, ["name"], as_dict=1)

	return frappe.get_all(
		"Warehouse",
		filters={"company": ["!=", com_name.name], "custom_visible_for_vehicles_orders": 1},
		fields=["name", "company"],
	)


@frappe.whitelist()
def check_warehouses(dealers, warehouse_names, model):
	dealers = json.loads(dealers)
	warehouse_names = json.loads(warehouse_names)
	count = frappe.db.count(
		"Vehicle Stock",
		{
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouse_names],
			"model": model,
			"availability_status": "Available",
		},
	)

	return count


@frappe.whitelist()
def check_warehouses_colours(dealers, warehouse_names, model, colour):
	dealers = json.loads(dealers)
	warehouse_names = json.loads(warehouse_names)
	count = frappe.db.count(
		"Vehicle Stock",
		{
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouse_names],
			"model": model,
			"availability_status": "Available",
			"colour": colour,
		},
	)

	return count


@frappe.whitelist(allow_guest=True)
def check_hq_stock_allocation_colour(dealers, warehouse_names, model, colour):
	dealers = json.loads(dealers)
	warehouse_names = json.loads(warehouse_names)

	return frappe.get_all(
		"Vehicle Stock",
		filters={
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouse_names],
			"model": model,
			"availability_status": "Available",
			"colour": colour,
		},
		fields=["target_warehouse", "dealer"],
	)


@frappe.whitelist(allow_guest=True)
def check_dealer_warehouses(dealers, warehouse_names, model):
	dealers = json.loads(dealers)
	warehouse_names = json.loads(warehouse_names)

	return frappe.get_all(
		"Vehicle Stock",
		filters={
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouse_names],
			"model": model,
			"availability_status": "Available",
		},
		fields=["dealer"],
	)


@frappe.whitelist(allow_guest=True)
def check_dealer_warehouses_colours(dealers, warehouse_names, model, colour):
	dealers = json.loads(dealers)
	warehouse_names = json.loads(warehouse_names)

	return frappe.get_all(
		"Vehicle Stock",
		filters={
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouse_names],
			"model": model,
			"availability_status": "Available",
			"colour": colour,
		},
		fields=["dealer"],
	)


@frappe.whitelist()
def check_stock_in_Dealer_warehouses(warehouses, model):
	available_dealers = set()
	for warehouse in warehouses:
		stock_docs = frappe.get_all(
			"Vehicle Stock",
			filters={
				"dealer": warehouse["company"],
				"target_warehouse": warehouse["name"],
				"model": model,
				"availability_status": "Available",
			},
			fields=["dealer"],
		)

		for doc in stock_docs:
			available_dealers.add(doc["dealer"])

	return list(available_dealers)


@frappe.whitelist()
def get_closest_shipment(model_code):
	closest_shipment = None

	# Fetch all shipments that are not hidden on stock availability
	shipments = frappe.get_all(
		"Vehicles Shipment",
		filters={"hide_on_stock_availability": 0},
		fields=["name", "eta_warehouse"],
		order_by="eta_warehouse asc",
	)

	# Check each shipment for items matching the model code
	for shipment in shipments:
		shipment_items = frappe.get_all(
			"Vehicles Shipment Items",
			filters={"parent": shipment["name"], "model_code": model_code},
			fields=["name"],
		)

		if shipment_items:
			closest_shipment = shipment
			break  # Exit loop on first match

	return closest_shipment


@frappe.whitelist()
def get_available_dealers(model_code, colour, warehouses):
	"""Fetch dealers with available stock based on model and colour."""
	available_dealers = []

	for warehouse in warehouses:
		stock_filters = {
			"target_warehouse": warehouse["name"],
			"dealer": warehouse["company"],
			"model": model_code,
			"availability_status": "Available",
		}
		if colour and colour != "Any Colour - " + model_code:
			stock_filters["colour"] = colour

		stock_docs = frappe.get_all("Vehicle Stock", filters=stock_filters, fields=["dealer"])

		if stock_docs:
			for doc in stock_docs:
				if doc.dealer not in available_dealers:
					available_dealers.append(doc.dealer)

	return available_dealers


@frappe.whitelist()
def check_stock_colour_hq(warehouses, model_code, colour):
	"""Check stock availability in HQ warehouses for the specified model and colour."""
	available_stock = []

	for warehouse in warehouses:
		stock_filters = {
			"target_warehouse": warehouse["name"],
			"dealer": warehouse["company"],
			"model": model_code,
			"availability_status": "Available",
		}
		if colour:
			stock_filters["colour"] = colour

		stock_docs = frappe.get_all("Vehicle Stock", filters=stock_filters, fields=["name"])

		if stock_docs:
			available_stock.append(warehouse["name"])

	return available_stock


@frappe.whitelist()
def get_company_address(company):
	company_name = company

	# Fetch address names from the Address Link child table where link_doctype is 'Company' and link_name matches the company
	address_links = frappe.get_all(
		"Dynamic Link",
		filters={"link_doctype": "Company", "link_name": company_name, "parenttype": "Address"},
		fields=["parent"],
	)

	# Fetch the actual address details for the linked addresses
	addresses = []
	for link in address_links:
		address_doc = frappe.get_doc("Address", link["parent"])
		if address_doc.address_type == "Shipping":
			addresses.append(
				{
					"name": address_doc.name,
					"address_line1": address_doc.address_line1,
					"city": address_doc.city,
					"country": address_doc.country,
					"pincode": address_doc.pincode,
				}
			)

	return addresses


@frappe.whitelist()
def get_model_details(model):
	model_doc = frappe.get_doc("Model Administration", model, ignore_permissions=True)

	model_details = []

	description = model_doc.model_description
	model_year = model_doc.model_year
	model_price = model_doc.dealer_billing_excl

	model_details.append({"description": description, "model_year": model_year, "model_price": model_price})

	return model_details
