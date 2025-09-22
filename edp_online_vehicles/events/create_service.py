import frappe
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def rfs_create_service(docname):
	doc = frappe.get_doc("Request for Service", docname)
	newdoc = frappe.new_doc("Vehicles Service")

	newdoc.vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.odo_reading_hours = doc.odo_reading
	newdoc.job_card_no = doc.job_card_no

	model_code = doc.model_no

	newdoc.service_type = f"SS-{model_code}-Minor"
	newdoc.current_location = doc.current_location

	if len(doc.parts) > 0:
		for part in doc.parts:
			newdoc.append(
				"service_parts_items",
				{
					"item": part.item,
					"description": part.description,
					"price_excl": part.price_excl,
					"qty": part.qty,
					"total_excl": part.total_excl,
					"uom": part.uom,
				},
			)

	if len(doc.labour) > 0:
		for part in doc.labour:
			newdoc.append(
				"service_labour_items",
				{
					"item": part.item,
					"description": part.labour_description,
					"duration_hours": part.duration_hours,
					"rate_hour": part.rate_hour,
					"total_excl": part.total_excl,
				},
			)

	if len(doc.extras) > 0:
		for part in doc.extras:
			newdoc.append(
				"transaction_list",
				{
					"item_no": part.item_no,
					"description": part.description,
					"document_no": part.document_no,
					"document_date": part.document_date,
					"qty": part.qty,
					"price_per_item_excl": part.price_per_item_excl,
					"total_excl": part.total_excl,
					"status": part.status,
					"date_paid": part.date_paid,
					"amount_paid": part.amount_paid,
					"document": part.document,
					"comment": part.comment,
				},
			)

	newdoc.insert()
	newdoc_link = get_link_to_form("Vehicles Service", newdoc.name)
	frappe.msgprint(f"New Vehicles Service Created: {newdoc_link}")


@frappe.whitelist()
def load_test_create_service(docname):
	doc = frappe.get_doc("Vehicles Load Test", docname)

	vinno = doc.vin_serial_no

	equip_doc = frappe.get_doc("Vehicle Stock", vinno)
	newdoc = frappe.new_doc("Vehicles Service")

	newdoc.vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.odo_reading_hours = doc.hour_meter
	newdoc.job_card_no = doc.job_card_no

	if equip_doc.current_location == "":
		frappe.msgprint(f"No location entered for {vinno} in Master Stock")
	else:
		newdoc.current_location = equip_doc.current_location

	model_code = doc.model

	newdoc.service_type = f"SS-{model_code}-Minor"

	newdoc.insert()
	newdoc_link = get_link_to_form("Vehicles Service", newdoc.name)
	frappe.msgprint(f"New Vehicles Service Created: {newdoc_link}")
