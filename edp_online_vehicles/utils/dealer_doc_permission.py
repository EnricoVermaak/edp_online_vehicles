from collections.abc import Collection

import frappe

DEFAULT_DENIED_PTYPES = frozenset({"read", "write", "print", "email", "export"})


def block_form_for_roles(
	*,
	blocked_roles: Collection[str],
	message: str = "You do not have access to this record.",
):

	blocked = frozenset(blocked_roles)

	def _onload(doc, method):
		if frappe.session.user == "Administrator":
			return
		if set(frappe.get_roles()) & blocked:
			frappe.throw(message, frappe.PermissionError)

	return _onload


def dealer_blocked_has_permission(
	doctype: str,
	*,
	restricted_roles: Collection[str],
	elevated_roles: Collection[str] | None = None,
	denied_ptypes: Collection[str] | None = None,
):

	restricted = frozenset(restricted_roles)
	elevated = frozenset(elevated_roles or ())
	denied = frozenset(denied_ptypes) if denied_ptypes is not None else DEFAULT_DENIED_PTYPES

	def _hook(doc, ptype, user, debug=False):
		if not doc or doc.doctype != doctype:
			return None
		if not user:
			user = frappe.session.user
		roles = set(frappe.get_roles(user))
		if not (roles & restricted):
			return None
		if roles & elevated:
			return None
		if ptype in denied:
			return False
		return None

	return _hook
