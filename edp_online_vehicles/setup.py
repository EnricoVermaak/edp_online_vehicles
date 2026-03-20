import frappe


RECALL_TYPE_OPTIONS = "Normal\nGoodwill\nRecall Campaign\nService Campaign\nMandatory Recall"
DEFAULT_TYPE_OPTIONS = "Normal\nGoodwill"


def after_migrate():
    _sync_recall_campaign_type_options()
    frappe.db.commit()


def _sync_recall_campaign_type_options():
    enabled = frappe.db.get_single_value(
        "Vehicles Warranty Settings", "enable_recall_campaigns"
    )
    target_value = RECALL_TYPE_OPTIONS if enabled else DEFAULT_TYPE_OPTIONS

    existing = frappe.db.get_value(
        "Property Setter",
        {"doc_type": "Vehicles Warranty Claims", "field_name": "type", "property": "options"},
        "name",
    )

    if enabled:
        if existing:
            frappe.db.set_value("Property Setter", existing, "value", target_value)
        else:
            frappe.get_doc({
                "doctype": "Property Setter",
                "doctype_or_field": "DocField",
                "doc_type": "Vehicles Warranty Claims",
                "field_name": "type",
                "property": "options",
                "property_type": "Small Text",
                "value": target_value,
            }).insert(ignore_permissions=True)
    else:
        if existing:
            frappe.delete_doc("Property Setter", existing, ignore_permissions=True)
