import frappe

SKIP_FIELDTYPES = {
    "Section Break", "Column Break", "Tab Break", "Table",
    "Table MultiSelect", "Button", "HTML", "Heading",
    "Image", "Attach", "Attach Image",
}


@frappe.whitelist()
def get_missing_required_fields(customer_doctype, customer_name):
    if not customer_name or customer_doctype not in ("Dealer Customer", "Fleet Customer"):
        return []

    if not frappe.db.exists(customer_doctype, customer_name):
        return []

    meta = frappe.get_meta(customer_doctype)
    doc = frappe.get_doc(customer_doctype, customer_name)

    missing = []
    for df in meta.fields:
        if df.fieldtype in SKIP_FIELDTYPES:
            continue
        if not df.reqd:
            continue
        value = doc.get(df.fieldname)
        if not value and value != 0:
            missing.append({"fieldname": df.fieldname, "label": df.label})

    return missing
