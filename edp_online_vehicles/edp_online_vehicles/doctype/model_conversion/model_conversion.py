import frappe
from frappe.model.document import Document


class ModelConversion(Document):
	def on_save(self):
		if hasattr(self, 'table_fgif') and self.table_fgif and self.status == "Approved":
			for vehicle_item in self.table_fgif:
				if vehicle_item.vehicle:
					frappe.db.set_value("Vehicle Stock", vehicle_item.vehicle, "model_conversion_date", self.conversion_date, update_modified=False)
					frappe.logger().info(f"Set model conversion date for VIN {vehicle_item.vehicle}: {self.conversion_date}")
					
					self._add_conversion_comment(vehicle_item.vehicle)
	
	def _add_conversion_comment(self, vin):
		"""Add a comment to the Vehicle Stock document explaining the conversion"""
		try:
			user = frappe.session.user
			
			vehicle_doc = frappe.get_doc("Vehicle Stock", vin)
			old_model = vehicle_doc.model if vehicle_doc.model != self.convert_to_model else self.model
			
			comment_text = f"Model Conversion: {self.model} → {self.convert_to_model}"
			if self.conversion_date:
				comment_text += f" (Date: {frappe.utils.format_date(self.conversion_date)})"
			
			frappe.get_doc({
				"doctype": "Comment",
				"comment_type": "Info",
				"reference_doctype": "Vehicle Stock",
				"reference_name": vin,
				"content": comment_text,
				"comment_by": user
			}).insert(ignore_permissions=True)
			
			frappe.logger().info(f"Added conversion comment to Vehicle Stock {vin}")
		except Exception as e:
			frappe.logger().error(f"Failed to add comment to Vehicle Stock {vin}: {str(e)}")

