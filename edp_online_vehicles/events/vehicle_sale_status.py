import frappe


@frappe.whitelist()
def change_default(doc_name, parent_doctype):
	records = frappe.get_all(parent_doctype, fields=["name", "default"])
	defaultStatus = None

	for record in records:
		if not record.get("name") == doc_name:
			default = record.get("default")
			if default == 1:
				defaultStatus = record.get("name")

	if defaultStatus:
		frappe.set_value(parent_doctype, defaultStatus, "default", 0)


@frappe.whitelist()
def get_default():
	records = frappe.get_all("Vehicle Sale Status", fields=["name", "default"])

	for record in records:
		default = record.get("default")
		if default == 1:
			return record.get("name")


@frappe.whitelist()
def get_status_order(doctype, txt, searchfield, start, page_len, filters):
	search_pattern = f"%{txt}%"

	status_order = filters.get("status_order")

	if status_order and str(status_order).strip():
		result = frappe.db.sql(
			f"""
			SELECT status
			FROM `tabVehicle Sale Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY FIELD(status, {status_order})
		""",
			(search_pattern,),
		)
	else:
		result = frappe.db.sql(
			"""
			SELECT status
			FROM `tabVehicle Sale Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY status
		""",
			(search_pattern,),
		)

	return result


@frappe.whitelist()
def get_order_status_order(doctype, txt, searchfield, start, page_len, filters):
	search_pattern = f"%{txt}%"

	status_order = filters.get("status_order")

	if status_order and str(status_order).strip():
		result = frappe.db.sql(
			f"""
			SELECT status
			FROM `tabVehicles Order Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY FIELD(status, {status_order})
		""",
			(search_pattern,),
		)
	else:
		result = frappe.db.sql(
			"""
			SELECT status
			FROM `tabVehicles Order Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY status
		""",
			(search_pattern,),
		)

	return result


@frappe.whitelist()
def get_HQ_status_order(doctype, txt, searchfield, start, page_len, filters):
	search_pattern = f"%{txt}%"

	status_order = filters.get("status_order")


	if status_order and str(status_order).strip():
		result = frappe.db.sql(
			f"""
			SELECT status
			FROM `tabVehicles Order Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY FIELD(status, {status_order})
		""",
			(search_pattern,),
		)
	else:
		result = frappe.db.sql(
			"""
			SELECT status
			FROM `tabVehicles Order Status`
			WHERE active = 1
			AND status LIKE %s
			ORDER BY status
		""",
			(search_pattern,),
		)

	return result


@frappe.whitelist()
def get_HQ_default():
	records = frappe.get_all("Vehicles Order Status", fields=["name", "default"])

	for record in records:
		default = record.get("default")
		if default == 1:
			return record.get("name")
