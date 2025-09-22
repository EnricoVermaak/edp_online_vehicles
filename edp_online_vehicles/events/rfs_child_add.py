import frappe
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def rfs_fun(docname):
	doc = frappe.get_doc("Vehicles Service", docname)
	newdoc = frappe.new_doc("Request for Service")
	newdoc.vin_serial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.odo_reading = doc.odo_reading_hours
	newdoc.centre = "Dry Goods"
	newdoc.technician = frappe.session.user

	for part in doc.service_parts_items:
		newdoc.append(
			"parts",
			{
				"item": part.item,
				"description": part.description,
				"price_excl": part.price_excl,
				"qty": part.qty,
				"total_excl": part.total_excl,
			},
		)
	for labor in doc.service_labour_items:
		newdoc.append(
			"labour",
			{
				"item": labor.item,
				"labour_description": labor.description,
				"rate_hour": labor.duration_hours,
				"duration_hours": labor.rate_hour,
				"total_excl": labor.total_excl,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Request for Service", newdoc.name)
	frappe.msgprint(f"New Request for Service is Created {newdoc_link}")


@frappe.whitelist()
def rfs_incedents(docname):
	doc = frappe.get_doc("Vehicles Incidents", docname)
	newdoc = frappe.new_doc("Request for Service")
	newdoc.vin_serial_no = doc.vin_serial_no
	newdoc.centre = "Dry Goods"
	newdoc.current_location = doc.location
	newdoc.odo_reading = doc.odo_reading_hours
	newdoc.customer = doc.customer
	newdoc.incident_no = doc.name
	newdoc.technician = frappe.session.user

	newdoc.insert()
	newdoc_link = get_link_to_form("Request for Service", newdoc.name)
	frappe.msgprint(f"New Request for Service is Created {newdoc_link}")


@frappe.whitelist()
def rfs_load_tests(docname):
	doc = frappe.get_doc("Vehicles Load Test", docname)

	vinno = doc.vin_serial_no

	equip_doc = frappe.get_doc("Vehicle Stock", vinno)
	newdoc = frappe.new_doc("Request for Service")

	newdoc.vin_serial_no = doc.vin_serial_no
	newdoc.centre = "Dry Goods"

	if equip_doc.current_location == "":
		frappe.msgprint(f"No location entered for {vinno} in Master Stock")
	else:
		newdoc.current_location = equip_doc.current_location

	if not equip_doc.dealer:
		frappe.msgprint(f"No Dealer entered for {vinno} in Master Stock")
	else:
		newdoc.dealer = equip_doc.dealer

	newdoc.odo_reading = doc.hour_meter
	newdoc.customer = doc.customer
	newdoc.job_card_no = doc.job_card_no
	newdoc.technician = frappe.session.user

	newdoc.insert()
	newdoc_link = get_link_to_form("Request for Service", newdoc.name)
	frappe.msgprint(f"New Request for Service is Created {newdoc_link}")
