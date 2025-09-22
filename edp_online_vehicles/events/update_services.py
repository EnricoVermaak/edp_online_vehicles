import frappe


@frappe.whitelist()
def update_services(allow_additional_parts_any_service):
	if int(allow_additional_parts_any_service) == 0:
		frappe.db.sql(
			"""
            UPDATE `tabVehicles Service`
            SET edit_parts = 0, edit_labour = 0
            WHERE service_type NOT LIKE %s
            AND docstatus = 0
        """,
			("%Other%",),
		)

		frappe.db.commit()
	else:
		frappe.db.sql(
			"""
            UPDATE `tabVehicles Service`
            SET edit_parts = 1, edit_labour = 1
            WHERE service_type NOT LIKE %s
            AND docstatus = 0
        """,
			("%Other%",),
		)

		frappe.db.commit()
