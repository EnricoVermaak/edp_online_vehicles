# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PartPickingSlip(Document):
	def autoname(self):
		# Check if there are existing orders with the same part_order_no
		if frappe.db.exists("Parts Delivery Note", {"part_order_no": self.part_order_no}):
			docs = frappe.get_all("Parts Delivery Note", filters={"part_order_no": self.part_order_no})

			index = 1

			if len(docs) > 0:
				index = (
					max(
						[
							int(doc.get("name").split("-")[3])
							for doc in docs
							if doc.get("name").split("-")[3].isdigit()
						],
						default=0,
					)
					+ 1
				)
		else:
			index = 1

		self.name = f"PPS-{self.part_order_no}-{index}"

	def on_submit(self):
		# Retrieve the HQ Part Order document
		hq_doc = frappe.get_doc("HQ Part Order", self.part_order_no)

		# Loop through each part in the delivery_note_item child table
		for part in self.table_qoik:
			# Search for a matching record in table_qmpy by part_no
			matching_record = None
			for rec in hq_doc.get("table_qmpy"):
				if rec.part_no == part.part_no:
					matching_record = rec
					break

					# If no matching record is found, skip this part
			if not matching_record:
				continue

				# Update cumulative qty_delivered by adding the current delivery's qty_delivered
			matching_record.qty_picked += part.qty_picked

		hq_doc.save()
		frappe.db.commit()

	def before_submit(self):
		self.status = "Completed"
