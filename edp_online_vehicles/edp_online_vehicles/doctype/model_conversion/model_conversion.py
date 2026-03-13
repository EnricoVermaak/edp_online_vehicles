import frappe
# import json
from frappe.model.document import Document
from edp_online_vehicles.events.update_vehicles_details import update_vehicles_details

class ModelConversion(Document):

	def on_update(self):
		# CONVERSION ONLY WHEN APPROVED
		if self.has_value_changed("status") and self.status == "Approved":

			if self.table_fgif:
				for vehicle_item in self.table_fgif:

					# Ensure Serial No exists
					if not vehicle_item.vin_serial_no:
						continue

					serial_no = vehicle_item.vin_serial_no

					# Update Vehicle Stock
					if frappe.db.exists("Vehicle Stock", serial_no):
						frappe.db.set_value(
							"Vehicle Stock",
							serial_no,
							"model_conversion_date",
							self.conversion_date,
							update_modified=False
						)

					# Update Serial Description ONLY
					if frappe.db.exists("Serial No", serial_no):
						doc = frappe.get_doc("Serial No", serial_no)
						doc.description = self.convert_to_description
						doc.save(ignore_permissions=True)
						
		# AUTO SUBMIT (APPROVED OR DECLINED)

		if (
			self.docstatus == 0
			and self.has_value_changed("status")
			and self.status in ["Approved", "Declined"]
		):
			self.submit()

	def before_submit(self):
		if self.status not in ["Approved", "Declined"]:
			frappe.throw("Document must be Approved or Declined before submitting.")



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
   
# @frappe.whitelist()
# def update_vehicles_details(items, convert_to_model):

# 	import json

# 	# Handle both JS calls and internal Python calls
# 	if isinstance(items, str):
# 		items = json.loads(items)

# 	for row in items:

# 		serial_no = row.get("vehicle")
# 		if not serial_no:
# 			continue

# 		# Example logic:
# 		# Update a custom "converted_model" field in Vehicle Stock

# 		if frappe.db.exists("Vehicle Stock", serial_no):
# 			frappe.db.set_value(
# 				"Vehicle Stock",
# 				serial_no,
# 				model,
# 				update_modified=False
# 			)
