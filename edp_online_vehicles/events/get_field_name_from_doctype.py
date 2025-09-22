import frappe


@frappe.whitelist()
def get_fields_and_labels_from_doctype(docname):
	fields = frappe.get_all(
		"DocField",
		filters={
			"parent": docname,
			"fieldtype": ["not in", ["Column Break", "Section Break", "Tab Break"]],
			"Label": ["!=", ""],
			"fieldname": ["!=", ""],
		},
		fields=["label", "name"],
	)

	return [{"label": field["label"], "fieldname": field["name"]} for field in fields]


# @frappe.whitelist()
# def get_fields_and_labels_from_doctype(docname):

#     fields = frappe.get_all(
#         'DocField',
#         filters={
#             'parent': docname,
#             'fieldtype': ['not in', ['Column Break', 'Section Break', 'Tab Break']],
#             'Label' : ['!=', ''],
#             'fieldname' : ['!=', '']
#         },
#         fields=['label', 'name', 'reqd']
#     )
#     return [{'label': field['label'], 'fieldname': field['name'], 'reqd': field['reqd']} for field in fields]


@frappe.whitelist()
def get_fields_from_doctype(docname):
	fields = frappe.get_all(
		"DocField",
		filters={
			"parent": docname,
			"fieldtype": ["not in", ["Column Break", "Section Break", "Tab Break", "Amended Form"]],
			"Label": ["!=", ""],
			"fieldname": ["!=", ""],
		},
		fields=["label"],
	)

	return [field["label"] for field in fields]


@frappe.whitelist()
def make_fields_mandatory(docname):
	fields = get_fields_and_labels_from_doctype(docname)

	child_field_labels = get_child_table_records(docname)

	if child_field_labels:
		for field in fields:
			label = field["label"]
			fieldname = field["fieldname"]
			is_mandatory = 0
			for child_label in child_field_labels:
				if label == child_label:
					is_mandatory = 1

			frappe.set_value("DocField", fieldname, "reqd", is_mandatory)
	else:
		return get_mandatory_fields(docname)


@frappe.whitelist()
def get_child_table_records(docname):
	child_records = frappe.get_all(
		"Mandatory Fields Items", filters={"parent": docname}, fields=["field_name"]
	)

	if child_records:
		return [record["field_name"] for record in child_records]


@frappe.whitelist()
def get_mandatory_fields(docname):
	fields = get_fields_from_doctype(docname)
	reqd_fields = []
	for field in fields:
		reqd = frappe.get_value("DocField", {"label": field}, "reqd")
		if reqd == 1:
			reqd_fields.append(field)

	return reqd_fields
