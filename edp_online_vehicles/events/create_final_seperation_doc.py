import frappe
from frappe.utils import nowdate
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def create_final_seperation_doc(doc, event=None):
	today = nowdate()

	fes_doc = frappe.new_doc("Final Employee Separation")

	fes_doc.employee = doc.employee
	fes_doc.relieving_date = today
	fes_doc.status = "Open"

	for row in doc.custom_assets:
		if row:
			fes_doc.append(
				"table_ujrc",
				{
					"item_code": row.get("item_code"),
					"asset_category": row.get("asset_category"),
					"location": row.get("location", ""),
					"gross_purchase_amount": row.get("gross_purchase_amount"),
				},
			)

			fes_doc.append(
				"table_fhuq",
				{
					"item_code": row.get("item_code"),
					"asset_category": row.get("asset_category"),
					"location": row.get("location", ""),
					"gross_purchase_amount": row.get("gross_purchase_amount"),
				},
			)

	fes_doc.insert(ignore_permissions=True)
	frappe.db.commit()

	fes_doc_link = get_link_to_form("Final Employee Separation", fes_doc.name)
	frappe.msgprint(f"New Final Employee Seperation Document Created: {fes_doc_link}")


@frappe.whitelist()
def create_final_onboarding_doc(doc, event=None):
	nowdate()

	feo_doc = frappe.new_doc("Final Employee Onboarding")

	feo_doc.job_applicant = doc.job_applicant
	feo_doc.job_offer = doc.job_offer
	feo_doc.status = doc.boarding_status
	feo_doc.company = doc.company
	feo_doc.employee_name = doc.employee_name
	feo_doc.date_of_joining = doc.date_of_joining
	feo_doc.onboarding_begins_on = doc.boarding_begins_on

	if doc.department:
		feo_doc.department = doc.department

	if doc.designation:
		feo_doc.designation = doc.designation

	if doc.employee_grade:
		feo_doc.employee_grade = doc.employee_grade

	if doc.holiday_list:
		feo_doc.holiday_list = doc.holiday_list

	if doc.custom_employment_type:
		feo_doc.employment_type = doc.custom_employment_type

	for row in doc.activities:
		if row:
			feo_doc.append(
				"activities",
				{
					"activity_name": row.get("activity_name"),
					"user": row.get("user"),
					"begin_on": row.get("begin_on"),
					"duration": row.get("duration"),
				},
			)

	feo_doc.insert(ignore_permissions=True)
	frappe.db.commit()

	feo_doc_link = get_link_to_form("Final Employee Onboarding", feo_doc.name)
	frappe.msgprint(f"New Final Employee Onboarding Document Created: {feo_doc_link}")
