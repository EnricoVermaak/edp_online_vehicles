import frappe


@frappe.whitelist()
def rental_return_status_change(vinno, status):
	doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vinno})

	frappe.flags.ignore_permissions = True

	if status == "Completed":
		doc.status = "Operational"
	else:
		doc.status = "Service Pending"

	doc.save(ignore_permissions=True)
	frappe.db.commit(ignore_permissions=True)
	return f"Vehicle Stock status updated for VIN No {vinno}"


@frappe.whitelist()
def stolen_vehicles_status_change(vinno, status):
	equip_doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vinno})

	frappe.flags.ignore_permissions = True

	if status in ["Recovered (Returned to Customer)"]:
		equip_doc.availability_status = "Sold"
		equip_doc.save(ignore_permissions=True)
		frappe.db.commit(ignore_permissions=True)

		return f"Vehicle Stock status updated for VIN No {vinno}"
	elif status == "Reported":
		equip_doc.availability_status = "Stolen"
		equip_doc.save(ignore_permissions=True)
		frappe.db.commit(ignore_permissions=True)
		return f"Vehicle Stock status updated for VIN No {vinno}"


@frappe.whitelist()
def service_status_change(vinno, status):
	equip_doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vinno})
	status_doc = frappe.get_doc("Service Status", {"name": status})

	frappe.flags.ignore_permissions = True

	if status_doc.set_vehicles_operational_status_to:
		equip_doc.status = status_doc.set_vehicles_operational_status_to
		equip_doc.save(ignore_permissions=True)
		frappe.db.commit(ignore_permissions=True)
		return f"Vehicle Stock status updated for VIN No {vinno}"


@frappe.whitelist()
def rfs_status_change(vinno, status):
	equip_doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vinno}, ignore_permissions=True)
	status_doc = frappe.get_doc("RFS Status", {"name": status}, ignore_permissions=True)

	if status_doc.set_vehicles_operational_status_to:
		try:
			equip_doc.status = status_doc.set_vehicles_operational_status_to
			equip_doc.save(ignore_permissions=True)
			return f"Vehicle Stock status updated for VIN No {vinno}"
		except Exception as e:
			frappe.log_error(frappe.get_traceback())
			frappe.msgprint(e)


@frappe.whitelist()
def warranty_status_change(vinno, status):
	equip_doc = frappe.get_doc("Vehicle Stock", {"vin_serial_no": vinno})
	status_doc = frappe.get_doc("Warranty Status", {"name": status})

	frappe.flags.ignore_permissions = True

	if status_doc.set_vehicles_operational_status_to:
		equip_doc.status = status_doc.set_vehicles_operational_status_to
		equip_doc.save(ignore_permissions=True)
		frappe.db.commit(ignore_permissions=True)
		return f"Vehicle Stock status updated for VIN No {vinno}"


@frappe.whitelist()
def add_status_to_settings(docname, table_name):
	status_table = frappe.get_doc("Vehicle Stock Settings")

	status_table.append(
		table_name,
		{
			"status": docname,
		},
	)

	status_table.save()

	reset_child_table_idx(table_name)


@frappe.whitelist()
def remove_status_from_settings(docname, table_name):
	status_table = frappe.get_doc("Vehicle Stock Settings")

	status_list = getattr(status_table, table_name)

	for status in status_list:
		if status.status == docname:
			status_list.remove(status)

	status_table.save()
	reset_child_table_idx(table_name)


@frappe.whitelist()
def reset_child_table_idx(table_name):
	parent_doc = frappe.get_doc("Vehicle Stock Settings")

	child_table = getattr(parent_doc, table_name)

	for idx, row in enumerate(child_table, 1):
		row.idx = idx

	parent_doc.save()
