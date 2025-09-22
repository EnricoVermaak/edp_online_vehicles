import frappe


def after_insert(doc, method=None):
	share_doctype = doc.share_doctype

	settings = frappe.get_doc("Document Sharing Settings")

	for row in settings.apply_permissions_on_doctypes:
		if row.doctype_1 == share_doctype:
			doc.read = row.read
			doc.write = row.write
			doc.share = row.share

	doc.save()

	frappe.db.commit()


def remove_share(doc, method=None):
	if doc.status == "Cancelled":
		frappe.db.delete(
			"DocShare",
			{"share_doctype": doc.reference_type, "share_name": doc.reference_name, "user": doc.allocated_to},
		)
	frappe.db.commit()
