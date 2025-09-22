import json

import frappe


@frappe.whitelist()
def check_order_amount(items):
	items = json.loads(items)

	dealers = []
	warehouses = []
	models = []

	# Map visible warehouses, dealers, and models
	visible_warehouses = frappe.get_all(
		"Warehouse",
		filters={"custom_hq_warehouse": 0, "custom_visible_for_equipment_orders": 1},
		fields=["name", "company"],
	)

	for warehouse in visible_warehouses:
		for item in items:
			if item.get("dealer") == warehouse.get("company"):
				if item.get("dealer") not in dealers:
					dealers.append(item.get("dealer"))
				if warehouse.get("name") not in warehouses:
					warehouses.append(warehouse.get("name"))
				if item.get("model") not in models:
					models.append(item.get("model"))

	# Get stock and order documents by dealer and model
	stock_docs = frappe.get_all(
		"Vehicle Stock",
		filters={
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouses],
			"model": ["in", models],
			"availability_status": "Available",
		},
		fields=["dealer", "model"],
	)

	order_docs = frappe.get_all(
		"Vehicles Dealer to Dealer Order",
		filters={"order_placed_to": ["in", dealers], "model": ["in", models], "status": "Pending"},
		fields=["order_placed_to", "model"],
	)

	# Count available stock and pending orders per dealer-model pair
	dealer_model_stock = {}
	dealer_model_orders = {}

	# Populate available stock counts per dealer-model
	for doc in stock_docs:
		dealer_model = (doc["dealer"], doc["model"])
		dealer_model_stock[dealer_model] = dealer_model_stock.get(dealer_model, 0) + 1

	# Populate pending order counts per dealer-model
	for order in order_docs:
		dealer_model = (order["order_placed_to"], order["model"])
		dealer_model_orders[dealer_model] = dealer_model_orders.get(dealer_model, 0) + 1

	# Collect items that can be ordered and generate insufficient stock messages
	insufficient_stock_messages = []
	items_to_order = []

	for item in items:
		dealer = item.get("dealer")
		model = item.get("model")
		dealer_model = (dealer, model)

		# Calculate net available stock after accounting for pending orders
		net_available_stock = dealer_model_stock.get(dealer_model, 0) - dealer_model_orders.get(
			dealer_model, 0
		)

		if net_available_stock > 0:
			# Add item if there is enough stock, decrement the stock and append item to order list
			items_to_order.append(item)
			dealer_model_stock[dealer_model] -= 1  # Decrement stock for next iteration
		else:
			# Add message for specific model with insufficient stock
			insufficient_stock_messages.append(f"• Model: {model}; Dealer: {dealer}")

	# Display message if there are insufficient stock items
	if insufficient_stock_messages:
		combined_message = (
			"There is no stock of the following to place an order due to pending orders at the selected Dealer:<br><br>"
			+ "<br>".join(insufficient_stock_messages)
		)
		frappe.msgprint(combined_message)

	# Return only items that passed the stock check
	return items_to_order


@frappe.whitelist()
def check_order_hq_amount(items):
	items = json.loads(items)

	dealers = []
	warehouses = []
	models = []

	# Map visible warehouses, dealers, and models
	visible_warehouses = frappe.get_all(
		"Warehouse",
		filters={"custom_hq_warehouse": 1, "custom_visible_for_equipment_orders": 1},
		fields=["name", "company"],
	)

	for warehouse in visible_warehouses:
		for item in items:
			if item.get("dealer") == warehouse.get("company"):
				if item.get("dealer") not in dealers:
					dealers.append(item.get("dealer"))
				if warehouse.get("name") not in warehouses:
					warehouses.append(warehouse.get("name"))
				if item.get("model") not in models:
					models.append(item.get("model"))

	# Get stock and order documents by dealer and model
	stock_docs = frappe.get_all(
		"Vehicle Stock",
		filters={
			"dealer": ["in", dealers],
			"target_warehouse": ["in", warehouses],
			"model": ["in", models],
			"availability_status": "Available",
		},
		fields=["dealer", "model"],
	)

	order_docs = frappe.get_all(
		"Head Office Vehicle Orders",
		filters={"order_placed_to": ["in", dealers], "model": ["in", models], "status": "Pending"},
		fields=["order_placed_to", "model"],
	)

	# Count available stock and pending orders per dealer-model pair
	dealer_model_stock = {}
	dealer_model_orders = {}

	# Populate available stock counts per dealer-model
	for doc in stock_docs:
		dealer_model = (doc["dealer"], doc["model"])
		dealer_model_stock[dealer_model] = dealer_model_stock.get(dealer_model, 0) + 1

	# Populate pending order counts per dealer-model
	for order in order_docs:
		dealer_model = (order["order_placed_to"], order["model"])
		dealer_model_orders[dealer_model] = dealer_model_orders.get(dealer_model, 0) + 1

	# Collect items that can be ordered and generate insufficient stock messages
	insufficient_stock_messages = []
	items_to_order = []

	for item in items:
		dealer = item.get("dealer")
		model = item.get("model")
		dealer_model = (dealer, model)

		# Calculate net available stock after accounting for pending orders
		net_available_stock = dealer_model_stock.get(dealer_model, 0) - dealer_model_orders.get(
			dealer_model, 0
		)

		if net_available_stock > 0:
			# Add item if there is enough stock, decrement the stock and append item to order list
			items_to_order.append(item)
			dealer_model_stock[dealer_model] -= 1  # Decrement stock for next iteration
		else:
			# Add message for specific model with insufficient stock
			insufficient_stock_messages.append(f"• Model: {model}; Dealer: {dealer}")

	# Display message if there are insufficient stock items
	if insufficient_stock_messages:
		combined_message = (
			"There is no stock of the following to place an order due to pending orders at the selected Dealer:<br><br>"
			+ "<br>".join(insufficient_stock_messages)
		)
		frappe.msgprint(combined_message)

	# Return only items that passed the stock check
	return items_to_order
