# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleStockSettings(Document):
	def on_update(self):
		if self.automatically_reserve_stock:
			models = frappe.db.get_all("Model Administration",filters={"automatically_reserve_model":0},pluck="name")
			# frappe.throw(f"models: {models}")
			for model in models:
				model_doc = frappe.get_doc("Model Administration",model)
				model_doc.automatically_reserve_model = 1
				model_doc.save()

			frappe.db.commit()
     
