from datetime import datetime, timedelta

import frappe


@frappe.whitelist()
def get_context(context=None):
	if not isinstance(context, dict):
		context = {}  # Initialize as a dictionary if not already one

	today = datetime.today()
	hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")

	headers = ["Range", "Model Code", "Description", str(hq_company), "Dealers", "Pipeline"]

	# Add future months headers
	for i in range(12):
		future_month = today + timedelta(days=30 * i)
		headers.append(f"{future_month.strftime('%B %Y')}")

	# Add headers to the context
	context["headers"] = headers
	return context
