from datetime import datetime, timedelta

import frappe
from frappe.utils import nowdate


@frappe.whitelist()
def check_mandatory_recon():
	# Check if mandatory recon is enabled
	mandatory_recon = frappe.db.get_single_value("Vehicle Stock Settings", "mandatory_unit_stock_check")

	# company = frappe.defaults.get_default("Company")

	# company_doc = frappe.get_doc("Company", company)

	# if company_doc:
	#     if company_doc.custom_ignore_mandatory_stock_check == 1:
	#         return "complete"

	if not mandatory_recon:
		return "complete"

	# Get today's date
	today = datetime.strptime(nowdate(), "%Y-%m-%d")

	# Fetch settings
	recon_day = frappe.db.get_single_value(
		"Vehicle Stock Settings", "mandatory_stock_check_on_day_of_every_month"
	)
	recon_due_days = frappe.db.get_single_value("Vehicle Stock Settings", "mandatory_stock_check_due_in_days")

	if not recon_day or recon_day < 1:
		return "settings_incomplete"

	# Get HQ company
	hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")

	# Get logged-in user's company
	user_company = frappe.defaults.get_user_default("Company")
	if not user_company:
		frappe.throw("No company is linked to the logged-in user.")
	elif user_company == hq_company:
		return  # HQ is not subject to recon restrictions

	# Get company's creation date
	company_creation_date = frappe.db.get_value("Company", user_company, "creation")

	# Calculate this month's recon period start and end dates
	current_month_start_date = today.replace(day=recon_day, hour=0, minute=1, second=0)

	# If the company was created after this month's mandatory recon start date, no restriction applies
	if company_creation_date > current_month_start_date:
		return "complete"

	# Check if today's date is before this month's recon period
	if today < current_month_start_date:
		# Calculate last month's recon period start and end
		last_month_start_date = (current_month_start_date - timedelta(days=30)).replace(day=recon_day)
		last_month_end_date = last_month_start_date + timedelta(
			days=recon_due_days - 1, hours=23, minutes=58, seconds=59
		)

		# Check last month's recon period for completed recon
		recon_last_month = frappe.db.exists(
			"Vehicles Recon",
			{
				"company": user_company,
				"docstatus": 1,  # Submitted documents
				"submitted_on": ["between", [last_month_start_date, last_month_end_date]],
			},
		)

		# Check for any recon submitted after last month's mandatory period
		latest_recon_after_last_month = frappe.db.get_value(
			"Vehicles Recon",
			filters={
				"company": user_company,
				"docstatus": 1,
				"submitted_on": [">", last_month_end_date],
			},
			fieldname="submitted_on",
			order_by="submitted_on DESC",
		)

		if recon_last_month or latest_recon_after_last_month:
			return "complete"
		else:
			return "incomplete"  # No recon for last month

	# If today is within this month's recon period
	recon_in_current_period = frappe.db.exists(
		"Vehicles Recon",
		{
			"company": user_company,
			"docstatus": 1,  # Submitted documents
			"submitted_on": [">=", current_month_start_date],
		},
	)

	if recon_in_current_period:
		return "complete"

	return "incomplete"
