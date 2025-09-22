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
