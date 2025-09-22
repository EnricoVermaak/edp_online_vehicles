# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)
	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Dealer"),
			"fieldname": "dealer",
			"fieldtype": "Link",
			"options": "Company",
			"width": 150,
		},
		{
			"label": _("Last Recon Document"),
			"fieldname": "last_recon_document",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Last Recon Date/Time"),
			"fieldname": "last_recon_date_time",
			"fieldtype": "Data",
			"width": 150,
		},
	]

	return columns


def get_data(filters):
	# Fetch settings
	mandatory_recon = frappe.db.get_single_value("Vehicle Stock Settings", "mandatory_unit_stock_check")
	recon_day = frappe.db.get_single_value(
		"Vehicle Stock Settings", "mandatory_stock_check_on_day_of_every_month"
	)
	recon_due_days = frappe.db.get_single_value("Vehicle Stock Settings", "mandatory_stock_check_due_in_days")

	if not mandatory_recon:
		frappe.throw("Mandatory Recon not Enabled for this site.")

	# Validate settings
	if not (recon_day and recon_due_days):
		frappe.throw("Mandatory Recon settings are incomplete.")

	# Get today's date
	today = datetime.now()

	# Calculate current recon period
	current_start_date = today.replace(day=recon_day, hour=0, minute=1, second=0)

	# If today is before this month's start date, use the last month's recon period
	if today < current_start_date:
		previous_month = (current_start_date - timedelta(days=1)).replace(day=1)
		current_start_date = previous_month.replace(day=recon_day, hour=0, minute=1, second=0)

	# Get HQ Company
	hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")

	# Apply dealer filter if provided
	dealer_filter = filters.get("dealer")
	dealer_conditions = {"is_group": 0, "custom_head_office": 0}
	if dealer_filter:
		dealer_conditions["name"] = dealer_filter

	# Fetch filtered dealer companies
	dealer_companies = frappe.get_all("Company", filters=dealer_conditions, fields=["name", "creation"])

	# List to store dealers without completed Recon
	dealers_without_recon = []

	for dealer in dealer_companies:
		# Skip HQ Company
		if dealer.name == hq_company:
			continue

		# Check if the dealer was created after the current recon period's start date
		if dealer.creation > current_start_date:
			continue

		# Fetch the last submitted Recon document for the dealer
		last_recon = frappe.db.get_value(
			"Vehicles Recon",
			{"company": dealer.name, "docstatus": 1},
			["name", "submitted_on"],
			order_by="submitted_on desc",
		)

		if last_recon:
			last_recon_name, last_recon_date = last_recon

			# Check if the last Recon was within the current recon period
			if last_recon_date >= current_start_date:
				continue

		else:
			# No Recon found
			last_recon_name = "No Recon Found"
			last_recon_date = "N/A"

		# Add dealer to the list
		dealers_without_recon.append(
			{
				"dealer": dealer.name,
				"last_recon_document": last_recon_name,
				"last_recon_date_time": last_recon_date,
			}
		)

	return dealers_without_recon
