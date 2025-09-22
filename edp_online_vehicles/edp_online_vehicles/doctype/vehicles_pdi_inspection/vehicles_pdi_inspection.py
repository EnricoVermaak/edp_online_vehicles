# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehiclesPDIInspection(Document):
	pass


@frappe.whitelist()
def inspection_template(template):
	inspection_items_sql = f"""
		SELECT
			category,
			description
		FROM
			`tabVehicles PDI Inspection List`
		WHERE
			parent='{template}'
	"""

	inspection_items = frappe.db.sql(inspection_items_sql, as_dict=True)

	print(f"\n\n\n {inspection_items} \n\n\n")

	return inspection_items
