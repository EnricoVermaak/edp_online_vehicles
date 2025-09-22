import frappe


@frappe.whitelist()
def update_employee_details(id, relieving_date):
	emp_doc = frappe.get_doc("Employee", {"name": id})

	if emp_doc:
		emp_doc.relieving_date = relieving_date
		emp_doc.status = "Left"

		emp_doc.save(ignore_permissions=True)
		frappe.db.commit()
