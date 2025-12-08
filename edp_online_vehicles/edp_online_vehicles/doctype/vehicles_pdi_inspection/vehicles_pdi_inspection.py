# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesPDIInspection(Document):
	pass


def has_permission(doc, ptype="read", user=None):
	"""
	Permission check for Vehicles PDI Inspection:
	- Dealers can view all inspections for their company (handled by permission query)
	- Dealers can only EDIT inspections they created themselves
	- Dealers cannot edit inspections created by HQ (Vehicles Administrator)
	- Vehicles Administrator can do everything
	"""
	if not user:
		user = frappe.session.user

	if user == "Administrator":
		return True

	# Get user roles
	user_roles = frappe.get_roles(user)

	# Vehicles Administrator can do everything
	if "Vehicles Administrator" in user_roles:
		return True

	# For Dealer Vehicle Administrator
	if "Dealer Vehicle Administrator" in user_roles:
		# Read permission is handled by permission query (they can see all for their company)
		if ptype == "read":
			return True

		# For write/edit/delete: Only allow if the dealer created the document themselves
		if ptype in ["write", "delete"]:
			# If the document owner is the current user, allow
			if doc.owner == user:
				return True
			# If the document owner is a Vehicles Administrator (HQ), deny write access
			owner_roles = frappe.get_roles(doc.owner)
			if "Vehicles Administrator" in owner_roles:
				return False
			# For other cases, allow (e.g., if another dealer user created it, but this shouldn't happen)
			return True

	# For other permission types, use default behavior
	return None


@frappe.whitelist()
def inspection_template(template):
	inspection_items_sql = f"""
		SELECT
			category,
			description
		FROM
			`tabVehicles PDI Inspection List`
		WHERE
			parent='{template}'
	"""

	inspection_items = frappe.db.sql(inspection_items_sql, as_dict=True)

	print(f"\n\n\n {inspection_items} \n\n\n")

	return inspection_items
