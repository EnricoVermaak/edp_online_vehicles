import frappe
from frappe.core.doctype.session_default_settings.session_default_settings import set_session_default_values


def set_default():
	if frappe.db.exists("User Permission", {"user": frappe.session.user, "allow": "Company"}):
		company_value = frappe.db.get_value(
			"User Permission", {"user": frappe.session.user, "allow": "Company"}, "for_value"
		)
		set_session_default_values({"company": company_value})
