# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class PartDispatch(Document):
    def autoname(self):
        self.name = make_autoname("PRT-DSP-.#####")


@frappe.whitelist()
def check_item(part_no):
    if frappe.db.exists("Item", {"name": part_no, "item_group": "Parts"}):
        item_doc = frappe.get_doc("Item", part_no)

        if item_doc:
            bin_location = item_doc.custom_bin_location
            return bin_location
    else:
        return False
