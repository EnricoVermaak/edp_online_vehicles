import frappe
from frappe import _
from frappe.model.document import Document
from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification


class Bulletin(Document):
	pass


def _get_admin_roles():
	return ["Vehicles Administrator", "System Manager"]


def _check_admin():
	user_roles = frappe.get_roles(frappe.session.user)
	if not any(r in user_roles for r in _get_admin_roles()):
		frappe.throw(_("Only Vehicles Administrator or System Manager can perform this action"))


def _get_target_users(doc):
	if not doc.target_roles:
		frappe.throw(_("Please select at least one target role before distributing"))

	role_names = [r.role for r in doc.target_roles]

	users = frappe.get_all(
		"Has Role",
		filters={"role": ["in", role_names], "parenttype": "User"},
		fields=["parent"],
		pluck="parent",
	)
	user_names = list({u for u in users if u and u not in ("Administrator", "Guest")})

	enabled_emails = []
	for user_name in user_names:
		is_enabled = frappe.db.get_value("User", user_name, "enabled")
		if not is_enabled:
			continue
		email = frappe.db.get_value("User", user_name, "email")
		enabled_emails.append(email or user_name)

	return enabled_emails


@frappe.whitelist()
def distribute(bulletin_name):
	_check_admin()
	doc = frappe.get_doc("Bulletin", bulletin_name)

	users = _get_target_users(doc)
	if not users:
		frappe.throw(_("No active users found for the selected roles"))

	notification_doc = frappe._dict(
		type="Alert",
		document_type="Bulletin",
		document_name=doc.name,
		subject=_("Bulletin: {0}").format(doc.subject),
		email_content=doc.message,
		from_user=frappe.session.user,
	)

	enqueue_create_notification(users, notification_doc)

	doc.db_set("distributed", 1)
	doc.db_set("distributed_on", frappe.utils.now_datetime())
	doc.db_set("distribution_count", len(users))

	frappe.msgprint(
		_("Bulletin distributed to {0} user(s)").format(len(users)),
		alert=True,
		indicator="green",
	)


@frappe.whitelist()
def resend(bulletin_name):
	_check_admin()
	doc = frappe.get_doc("Bulletin", bulletin_name)

	existing = frappe.get_all(
		"Notification Log",
		filters={
			"document_type": "Bulletin",
			"document_name": doc.name,
		},
		pluck="name",
	)

	for log_name in existing:
		frappe.db.sql(
			"UPDATE `tabNotification Log` SET `read` = 0 WHERE name = %s",
			log_name,
		)

	if existing:
		frappe.msgprint(
			_("Reset {0} notification(s) to unread").format(len(existing)),
			alert=True,
			indicator="green",
		)
	else:
		frappe.msgprint(
			_("No existing notifications found. Use Distribute first."),
			alert=True,
			indicator="orange",
		)


@frappe.whitelist()
def get_distribution_status(bulletin_name):
	_check_admin()

	logs = frappe.db.sql(
		"""
		SELECT for_user, `read`, modified
		FROM `tabNotification Log`
		WHERE document_type = 'Bulletin' AND document_name = %s
		ORDER BY `read` ASC, for_user ASC
		""",
		bulletin_name,
		as_dict=True,
	)

	result = []
	for log in logs:
		full_name = frappe.db.get_value("User", log.for_user, "full_name") or log.for_user
		result.append({
			"user": log.for_user,
			"full_name": full_name,
			"status": "Read" if log.read else "Unread",
			"read_on": frappe.utils.format_datetime(log.modified) if log.read else "",
		})

	return result


@frappe.whitelist()
def mark_bulletin_read(bulletin_name):
	user = frappe.session.user
	frappe.db.sql(
		"""
		UPDATE `tabNotification Log`
		SET `read` = 1, modified = NOW()
		WHERE document_type = 'Bulletin'
		  AND document_name = %s
		  AND for_user = %s
		  AND `read` = 0
		""",
		(bulletin_name, user),
	)
	frappe.db.commit()


@frappe.whitelist()
def get_unread_bulletins():
	user = frappe.session.user
	logs = frappe.db.sql(
		"""
		SELECT nl.name AS log_name, nl.document_name, nl.subject,
		       b.subject AS bulletin_subject, b.posting_date
		FROM `tabNotification Log` nl
		JOIN `tabBulletin` b ON b.name = nl.document_name
		WHERE nl.document_type = 'Bulletin'
		  AND nl.for_user = %s
		  AND nl.`read` = 0
		  AND b.status = 'Active'
		ORDER BY b.posting_date DESC
		""",
		user,
		as_dict=True,
	)
	return logs
