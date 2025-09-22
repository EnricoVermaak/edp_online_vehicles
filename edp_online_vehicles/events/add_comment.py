import frappe


@frappe.whitelist()
def add_comment(docname, value):
	doc = frappe.get_doc("Request for Service", docname)
	doc.add_comment("Comment", f"Odo Reading updated from Service {value}")
	doc.save()


@frappe.whitelist()
def add_comments(doctype, docname, message):
	doc = frappe.get_doc(doctype, docname)
	doc.add_comment("Comment", message)
	doc.save()
	doc.submit()
