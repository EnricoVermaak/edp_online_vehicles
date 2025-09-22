import frappe


@frappe.whitelist()
def like_document_for_role(doc_type, doc_name, role):
	"""
	Automatically like a document for all users with a specified role.
	:param doc_type: The DocType of the document (e.g., "Task").
	:param doc_name: The name of the document.
	:param role: The role for which users should like the document.
	"""
	# Get all users with the specified role
	users_with_role = frappe.get_all("Has Role", filters={"role": role}, fields=["parent"])

	if not users_with_role:
		frappe.throw(f"No users found with the role: {role}")

	for user_entry in users_with_role:
		user = user_entry.get("parent")

		# Check if the user has already liked the document
		already_liked = frappe.db.exists(
			"Communication",
			{
				"communication_type": "Like",
				"reference_doctype": doc_type,
				"reference_name": doc_name,
				"sender": user,
			},
		)

		if not already_liked:
			# Add a like to the document for the user
			frappe.get_doc(
				{
					"doctype": "Communication",
					"communication_type": "Like",
					"reference_doctype": doc_type,
					"reference_name": doc_name,
					"sender": user,
				}
			).insert(ignore_permissions=True)
