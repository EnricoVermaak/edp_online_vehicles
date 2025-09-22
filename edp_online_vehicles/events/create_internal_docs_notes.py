import frappe
from frappe.model.mapper import get_mapped_doc


@frappe.whitelist()
def service_internal_docs_notes(source_name, target_doc=None):
	doc = get_mapped_doc(
		"Vehicles Service",
		source_name,
		{
			"Vehicles Service": {
				"doctype": "Internal Docs and Notes",
				"field_map": {"vinserial_no": "service"},
			},
		},
		target_doc,
	)

	return doc
