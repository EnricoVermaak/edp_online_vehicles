import frappe
from frappe.utils import getdate


@frappe.whitelist()
def calculate_days(from_date, to_date):
	from_date = getdate(from_date)
	to_date = getdate(to_date)

	delta = to_date - from_date

	days_between = delta.days

	return days_between
