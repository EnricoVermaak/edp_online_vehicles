# Copyright (c) 2026, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ItemDetails(Document):
	@frappe.whitelist()
	def create_item(self):
		part_no = self.item_code
		description = self.item_description
		item_group = self.item_group
		bin_location = self.bin_location
		uom = self.uom
		service_gp = self.service_gp
		warranty_gp = self.warranty_gp

		if frappe.db.exists("Item", part_no):
			frappe.throw(f"Item {part_no} already exists")
		
		# Check if the Bin Location exists
		if bin_location and not frappe.db.exists("Bin Location", {"bin_location": bin_location}):
			# Create the Bin Location
			new_bin_location = frappe.get_doc(
				{
					"doctype": "Bin Location",
					"bin_location": bin_location
				}
			)
			new_bin_location.insert(ignore_permissions=True)
			new_bin_location.submit()

		new_part = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code":part_no,
				"item_name":part_no,
				"item_group":item_group,
				"description":description,
				"custom_bin_location":bin_location,
				"custom_warranty_gp":warranty_gp,
				"custom_service_gp":service_gp,
				
				"stock_uom":uom,
				"disabled":0,
				"is_stock_item":1,
				"valuation_rate":1,
				"is_sales_item":1
			}
		)
		new_part.insert(ignore_permissions=True)
		new_part.submit()
		
		price_lists_seen = []

		for row in self.table_item_price_lists:
			if row.price_list in price_lists_seen:
				frappe.throw(f"There can only be one {row.price_list} price list per item")

			price_lists_seen.append(row.price_list)

			if frappe.db.exists("Item Price",{"item_code": part_no, "price_list": row.price_list}):
				frappe.throw(f"Item {part_no} already has a {row.price_list} price list")

			new_part_price = frappe.get_doc(
				{
					"doctype": "Item Price",
					"item_code":part_no,
					"uom":uom,
					"price_list":row.price_list,
					"buying":0,
					"selling":1,
					"currency":"ZAR",
					"price_list_rate":row.rate_excl,
					"custom_rate_vat_included":row.rate_incl
				}
			)
			new_part_price.insert(ignore_permissions=True)
		frappe.db.commit()
		frappe.msgprint(f"{part_no} has been created")