import frappe
from frappe.utils import today
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def create_material_request_service(docname):
	doc = frappe.get_doc("Vehicles Service", docname)
	newdoc = frappe.new_doc("Material Request")
	newdoc.custom_linked_service_id = docname
	newdoc.custom_vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.custom_customer_name = doc.customer_name
	newdoc.material_request_type = "Material Transfer"
	newdoc.company = frappe.defaults.get_user_default("company")
	newdoc.transaction_date = today()
	newdoc.custom_job_reference = doc.job_card_no

	for part in doc.service_parts_items:
		newdoc.append(
			"items",
			{
				"item_code": part.item,
				"item_name": part.description,
				"qty": part.qty,
				"uom": part.uom,
				"schedule_date": doc.part_schedule_date,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Material Request", newdoc.name)
	frappe.msgprint(f"New Material Request is Created: {newdoc_link}")


@frappe.whitelist()
def create_material_request_warranty(docname):
	doc = frappe.get_doc("Vehicles Warranty Claims", docname)
	newdoc = frappe.new_doc("Material Request")
	newdoc.custom_linked_warranty_id = docname
	newdoc.custom_vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.custom_customer_name = doc.customer_name
	newdoc.material_request_type = "Material Transfer"
	newdoc.company = frappe.defaults.get_user_default("company")
	newdoc.transaction_date = today()

	for part in doc.part_items:
		newdoc.append(
			"items",
			{
				"item_code": part.item,
				"item_name": part.description,
				"qty": part.qty,
				"uom": part.uom,
				"schedule_date": doc.part_schedule_date,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Material Request", newdoc.name)
	frappe.msgprint(f"New Material Request is Created: {newdoc_link}")


@frappe.whitelist()
def create_material_request_rfs(docname):
	doc = frappe.get_doc("Request for Service", docname)
	newdoc = frappe.new_doc("Material Request")
	newdoc.custom_linked_rfs_id = docname
	newdoc.custom_vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.custom_customer_name = doc.customer_name
	newdoc.material_request_type = "Material Transfer"
	newdoc.company = frappe.defaults.get_user_default("company")
	newdoc.transaction_date = today()
	newdoc.custom_job_reference = doc.job_card_no

	for part in doc.parts:
		newdoc.append(
			"items",
			{
				"item_code": part.item,
				"item_name": part.description,
				"qty": part.qty,
				"uom": part.uom,
				"schedule_date": doc.part_schedule_date,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Material Request", newdoc.name)
	frappe.msgprint(f"New Material Request is Created: {newdoc_link}")
