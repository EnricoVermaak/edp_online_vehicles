import frappe


@frappe.whitelist()
def add_comments(doctype, docname, message):
	doc = frappe.get_doc(doctype, docname)
	doc.add_comment("Comment", message)
	doc.save()


@frappe.whitelist()
def report_reserved_vehicle_as_stolen(vinno, message):
	doc = frappe.get_doc("Reserved Vehicles", {"vin_serial_no": vinno})

	doc.status = "Available"
	doc.add_comment("Comment", message)

	doc.save()
	doc.submit()

	return message


@frappe.whitelist()
def report_allocated_to_order_vehicle_as_stolen(vinno, message):
	doc = frappe.get_doc("Head Office Vehicle Orders", {"vinserial_no": vinno})

	doc.price_excl = None
	doc.vinserial_no = None
	doc.modelyear_delivered = None
	doc.colour_delivered = None
	doc.shipment_stock = None
	doc.shipment_no = None
	doc.shipment_target_warehouse = None
	doc.add_comment("Comment", message)

	doc.save()

	return message


@frappe.whitelist()
def report_vehicle_as_stolen(vinno, availability_status, dealer, date_time_of_theft):
	message = "Vehicle has been reported as stolen."
	doc = frappe.get_doc("Vehicle Stock", vinno)

	doc.add_comment("Comment", message)
	doc.availability_status = "Stolen"

	doc.save()

	if availability_status == "Reserved":
		report_reserved_vehicle_as_stolen(vinno, message)
	elif availability_status == "Allocated to Order":
		report_allocated_to_order_vehicle_as_stolen(vinno, message)

	stolen_register_doc = frappe.new_doc("Stolen Vehicles Register")

	stolen_register_doc.vin_serial_no = vinno
	stolen_register_doc.dealer = dealer
	stolen_register_doc.date_time_of_theft = date_time_of_theft
	stolen_register_doc.status = "Pending"

	stolen_register_doc.insert(ignore_permissions=True)
	stolen_register_doc.save(ignore_permissions=True)

	frappe.msgprint("Vehicle has been reported as stolen")

	return message
