import frappe


@frappe.whitelist()
def create_reserve_doc(
	docnames, dealer, status, reserve_reason, reserve_from_date, reserve_to_date=None, customer=None
):
	docnames = frappe.parse_json(docnames)
	last_name = None

	for docname in docnames:
		if frappe.db.exists("Reserved Vehicles", docname):
			reserve_doc = frappe.get_doc("Reserved Vehicles", docname)
		else:
			reserve_doc = frappe.new_doc("Reserved Vehicles")
			reserve_doc.vin_serial_no = docname
			reserve_doc.insert(ignore_permissions=True)

		reserve_doc.dealer = dealer
		if customer:
			reserve_doc.customer = customer
		reserve_doc.status = status
		reserve_doc.reserve_reason = reserve_reason
		reserve_doc.reserve_from_date = reserve_from_date
		if reserve_to_date:
			reserve_doc.reserve_to_date = reserve_to_date
		else:
			reserve_doc.reserve_to_date = None
		reserve_doc.save(ignore_permissions=True)
		last_name = reserve_doc.name

		stock_doc = frappe.get_doc("Vehicle Stock", docname)
		stock_doc.availability_status = "Reserved"
		stock_doc.reserve_reason = reserve_reason
		stock_doc.save(ignore_permissions=True)
		frappe.db.commit()

	frappe.msgprint(f"Stock reserved for dealer {dealer}")
	return last_name or (docnames[0] if docnames else None)


@frappe.whitelist()
def get_vin_no(docnames):
	vinno = []
	for docname in docnames:
		vehicles_doc = frappe.get_doc("Reserved Vehicles", docname)
		vinno.append(vehicles_doc.vin_serial_no)

	return vinno


@frappe.whitelist()
def create_shipment_reserve_doc(
	vinno,
	dealer,
	customer,
	reserve_reason,
	reserve_from_date,
	head_office_vehicle_order,
	reserve_to_date=None,
):
	new_doc = frappe.new_doc("Reserved Shipment Vehicles")

	new_doc.vin_serial_no = vinno
	new_doc.dealer = dealer
	new_doc.customer = customer
	new_doc.status = "Reserved"
	new_doc.reserve_reason = reserve_reason
	new_doc.reserve_from_date = reserve_from_date
	new_doc.head_office_vehicle_order = head_office_vehicle_order

	if reserve_to_date:
		new_doc.reserve_to_date = reserve_to_date

	new_doc.insert(ignore_permissions=True)
	new_doc.save(ignore_permissions=True)

	frappe.db.commit()

	frappe.msgprint(f"Stock reserved for dealer {dealer}")

	return new_doc.name


@frappe.whitelist()
def back_order_custom_qry(start, page_len, dealer, model, colour):
	return frappe.db.sql(
		"""
        SELECT name, description, model, colour
        FROM `tabHead Office Vehicle Orders`
        WHERE order_placed_by = %(dealer)s
            AND order_type = 'Back Order'
            AND model = %(model)s
            AND colour = %(colour)s
            And vinserial_no IS NULL
        ORDER BY order_datetime DESC
        LIMIT %(start)s, %(page_len)s
    """,
		{"dealer": dealer, "model": model, "colour": colour, "start": start, "page_len": page_len},
	)
