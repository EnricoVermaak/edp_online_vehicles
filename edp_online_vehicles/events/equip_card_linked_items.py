import frappe


@frappe.whitelist()
def equip_card_linked_items(vinno):
	item_docs = frappe.get_all(
		"Item Card", filters={"vin_serial_no": vinno, "status": "Linked"}, fields=["item"]
	)

	return item_docs
