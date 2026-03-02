import frappe


@frappe.whitelist()
def get_workspace(doctype):
	workspaces = frappe.get_all(
		"Workspace", fields=["title", "name"]
	)

	for ws in workspaces:
		doc = frappe.get_doc("Workspace", ws.name)
		for field in ["shortcuts", "links"]:
			for link in doc.get(field) or []:
				if (link.link_to == doctype) :
					return ws.name
	return "None"
