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

   
    delivery_notes = frappe.get_list(
        "Delivery Note",
        filters={"custom_hq_part_order": hq_name, "docstatus": 1},  
        fields=["*"]  
    )

    hq_items_map = {row.part_no: row for row in hq_doc.table_qmpy}

    for dn in delivery_notes:
     
        for dn_item in dn.get("items", []):
            if dn_item.get("item_code") in hq_items_map:
                hq_item = hq_items_map[dn_item["item_code"]]
                hq_item.qty_delivered = dn_item.get("custom_qty_delivered")

    for row in hq_doc.table_qmpy:
        if flt(row.qty_ordered):
            row._delivered = (row.qty_delivered / row.qty_ordered) * 100
     
    hq_doc.save(ignore_permissions=True)
    # frappe.db.commit()
