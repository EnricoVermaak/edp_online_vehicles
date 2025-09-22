import frappe


@frappe.whitelist()
def update_equip_order_status(order_doc, status, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.status = status

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_vinno(order_doc, vinno, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.vin_serial_no = vinno

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_price(order_doc, price, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.price_excl = price

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_all(order_doc, price, vinno, status, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.price_excl = price
			item.status = status
			item.vin_serial_no = vinno

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_vinno_status(order_doc, vinno, status, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.status = status
			item.vin_serial_no = vinno

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_price_vinno(order_doc, price, vinno, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.price_excl = price
			item.vin_serial_no = vinno

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist()
def update_equip_order_price_status(order_doc, price, status, row_id):
	order_doc = frappe.get_doc("Vehicle Order", order_doc)

	row_id = int(row_id)

	for item in order_doc.vehicles_basket:
		if item.idx == row_id:
			item.price_excl = price
			item.status = status

	order_doc.save(ignore_permissions=True)
	frappe.db.commit()
