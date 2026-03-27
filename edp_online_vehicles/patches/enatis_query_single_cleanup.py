import frappe


def execute():
	doctype = "eNaTIS Query"
	if not frappe.db.exists("DocType", doctype):
		return
	if not frappe.get_meta(doctype, cached=False).issingle:
		return

	single_name = doctype
	for name in frappe.get_all(doctype, pluck="name") or []:
		if name != single_name:
			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)

	if not frappe.db.exists(doctype, single_name):
		doc = frappe.new_doc(doctype)
		doc.insert(ignore_permissions=True)
