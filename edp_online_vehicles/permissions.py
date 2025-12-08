import frappe


def vehicles_service_query(user):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	user_doc = frappe.get_doc("User", user)
	if user_doc.user_type == "System User":
		return ""

	contact = frappe.get_value("Contact", {"user": user}, "name")

	if contact:
		customer = frappe.get_value(
			"Dynamic Link",
			{"link_doctype": "Customer", "parenttype": "Contact", "parent": contact},
			"link_name",
		)

	else:
		frappe.msgprint(f"No contact found for user {user}")

	customers = [customer]

	child_customers = frappe.get_all("Customer", {"custom_parent_customer": customer}, "name")

	for customer in child_customers:
		customers.append(customer.name)

	customers_in_clause = ", ".join(f"'{c}'" for c in customers)

	return f"(`tabVehicles Service`.customer IN ({customers_in_clause}))"


def vehicles_stock_query(user):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	user_doc = frappe.get_doc("User", user)
	if user_doc.user_type == "System User":
		return ""

	contact = frappe.get_value("Contact", {"user": user}, "name")

	if contact:
		customer = frappe.get_value(
			"Dynamic Link",
			{"link_doctype": "Customer", "parenttype": "Contact", "parent": contact},
			"link_name",
		)

	else:
		frappe.msgprint(f"No contact found for user {user}")

	customers = [customer]

	child_customers = frappe.get_all("Customer", {"custom_parent_customer": customer}, "name")

	for customer in child_customers:
		customers.append(customer.name)

	customers_in_clause = ", ".join(f"'{c}'" for c in customers)

	return f"(`tabVehicle Stock`.customer IN ({customers_in_clause}))"


def vehicles_warranty_query(user):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	user_doc = frappe.get_doc("User", user)
	if user_doc.user_type == "System User":
		return ""

	contact = frappe.get_value("Contact", {"user": user}, "name")

	if contact:
		customer = frappe.get_value(
			"Dynamic Link",
			{"link_doctype": "Customer", "parenttype": "Contact", "parent": contact},
			"link_name",
		)

	else:
		frappe.msgprint(f"No contact found for user {user}")

	customers = [customer]

	child_customers = frappe.get_all("Customer", {"custom_parent_customer": customer}, "name")

	for customer in child_customers:
		customers.append(customer.name)

	customers_in_clause = ", ".join(f"'{c}'" for c in customers)

	return f"(`tabVehicles Warranty Claims`.customer IN ({customers_in_clause}))"


def request_for_service_query(user):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	user_doc = frappe.get_doc("User", user)
	if user_doc.user_type == "System User":
		return ""

	contact = frappe.get_value("Contact", {"user": user}, "name")

	if contact:
		customer = frappe.get_value(
			"Dynamic Link",
			{"link_doctype": "Customer", "parenttype": "Contact", "parent": contact},
			"link_name",
		)

	else:
		frappe.msgprint(f"No contact found for user {user}")

	customers = [customer]

	child_customers = frappe.get_all("Customer", {"custom_parent_customer": customer}, "name")

	for customer in child_customers:
		customers.append(customer.name)

	customers_in_clause = ", ".join(f"'{c}'" for c in customers)

	return f"(`tabRequest for Service`.customer IN ({customers_in_clause}))"


def vehicles_load_test_query(user):
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	user_doc = frappe.get_doc("User", user)
	if user_doc.user_type == "System User":
		return ""

	contact = frappe.get_value("Contact", {"user": user}, "name")

	if contact:
		customer = frappe.get_value(
			"Dynamic Link",
			{"link_doctype": "Customer", "parenttype": "Contact", "parent": contact},
			"link_name",
		)

	else:
		frappe.msgprint(f"No contact found for user {user}")

	customers = [customer]

	child_customers = frappe.get_all("Customer", {"custom_parent_customer": customer}, "name")

	for customer in child_customers:
		customers.append(customer.name)

	customers_in_clause = ", ".join(f"'{c}'" for c in customers)

	return f"(`tabVehicles Load Test`.customer IN ({customers_in_clause}))"


def vehicles_pdi_inspection_query(user):
	"""
	Permission query for Vehicles PDI Inspection:
	- Vehicles Administrator: Can see all PDI inspections
	- Dealer Vehicle Administrator: Can only see PDI inspections where dealer matches their company
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	# Check if user has Vehicles Administrator role - they can see all
	if "Vehicles Administrator" in frappe.get_roles(user):
		return ""

	# Check if user has Dealer Vehicle Administrator role
	if "Dealer Vehicle Administrator" in frappe.get_roles(user):
		# Get user's default company - IMPORTANT: pass user parameter to get the correct user's company
		user_company = frappe.defaults.get_user_default("Company", user=user)
		
		if not user_company:
			# If no company set, return condition that matches nothing
			return "(`tabVehicles PDI Inspection`.dealer IS NULL)"
		
		# Filter by dealer field matching user's company
		return f"(`tabVehicles PDI Inspection`.dealer = {frappe.db.escape(user_company, percent=False)})"

	# For other roles, return empty string (no additional filtering)
	return ""


def vehicle_buy_back_query(user):
	"""
	Permission query for Vehicle Buy Back:
	- Vehicles Administrator: Can see all buy back records
	- Dealer Vehicle Administrator: Can only see buy back records where dealer matches their company
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return

	# Check if user has Vehicles Administrator role - they can see all
	if "Vehicles Administrator" in frappe.get_roles(user):
		return ""

	# Check if user has Dealer Vehicle Administrator role
	if "Dealer Vehicle Administrator" in frappe.get_roles(user):
		# Get user's default company - IMPORTANT: pass user parameter to get the correct user's company
		user_company = frappe.defaults.get_user_default("Company", user=user)
		
		if not user_company:
			# If no company set, return condition that matches nothing
			return "(`tabVehicle Buy Back`.dealer IS NULL)"
		
		# Filter by dealer field matching user's company
		return f"(`tabVehicle Buy Back`.dealer = {frappe.db.escape(user_company, percent=False)})"

	# For other roles, return empty string (no additional filtering)
	return ""
