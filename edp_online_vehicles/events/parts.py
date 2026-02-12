import frappe
from frappe.utils import flt

def update_hq_from_dn_after_insert(doc, method):
    """
    Update HQ Part Order automatically after Delivery Note is inserted.
    Fully fixed: row-wise delivery %, parent totals, only submitted DNs considered.
    """

    hq_name = doc.custom_hq_part_order
    if not hq_name:
        return 

    hq_doc = frappe.get_doc("HQ Part Order", hq_name)

    for row in hq_doc.table_qmpy:
        row.qty_delivered = 0
        row._delivered = 0

    delivery_notes = frappe.get_all(
        "Delivery Note",
        filters={"custom_hq_part_order": hq_name},
        fields=["name"]
    )

    hq_items_map = {row.part_no: row for row in hq_doc.table_qmpy}

    for dn in delivery_notes:
        dn_doc = frappe.get_doc("Delivery Note", dn.name)
        for dn_item in dn_doc.items:
            if dn_item.item_code in hq_items_map:
                hq_item = hq_items_map[dn_item.item_code]
                hq_item.qty_delivered += flt(dn_item.qty)

    for row in hq_doc.table_qmpy:
        if flt(row.qty_ordered):
            row._delivered = (row.qty_delivered / row.qty_ordered) * 100
        else:
            row._delivered = 0

    total_ordered = sum([flt(row.qty_ordered) for row in hq_doc.table_qmpy])
    total_delivered = sum([flt(row.qty_delivered) for row in hq_doc.table_qmpy])

    hq_doc.total_qty_parts_ordered = total_ordered
    if total_ordered:
        hq_doc._delivered = (total_delivered / total_ordered) * 100
    else:
        hq_doc._delivered = 0

    hq_doc.save(ignore_permissions=True)
    frappe.db.commit()