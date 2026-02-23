import json

import frappe


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def head_office_orders_vin_filter(doctype, txt, searchfield, start, page_len, filters):
	model = filters.get("model")
	availability_status = filters.get("availability_status")
	dealer = filters.get("dealer")

	return frappe.db.sql(
		"""
        SELECT
            es.name,
            es.vin_serial_no,
            es.model,
            es.colour,
            es.description,
            se.posting_date
        FROM
            `tabVehicle Stock` es
        LEFT JOIN
            `tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
        LEFT JOIN
            `tabStock Entry` se ON se.name = sed.parent
        WHERE
            se.stock_entry_type = 'Material Receipt'
            AND (es.{key} LIKE %(txt)s OR es.vin_serial_no LIKE %(txt)s)
            AND es.model = %(model)s
            AND es.availability_status = %(availability_status)s
            AND es.dealer = %(dealer)s
            AND se.name IN (
                SELECT MIN(se2.name)
                FROM `tabStock Entry` se2
                LEFT JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
                WHERE se2.stock_entry_type = 'Material Receipt'
                AND sed2.serial_no = es.vin_serial_no
                GROUP BY sed2.serial_no
            )
        ORDER BY
            se.posting_date ASC,
            se.posting_time ASC
        LIMIT
            %(page_len)s OFFSET %(start)s
    """.format(
			**{
				"key": searchfield,
			}
		),
		{
			"txt": f"%{txt}%",
			"start": start,
			"page_len": page_len,
			"model": model,
			"availability_status": availability_status,
			"dealer": dealer,
		},
	)


@frappe.whitelist()
def head_office_orders_vin_dialog_filter(model, availability_status, dealer, colour):
    colour = f"{colour} - {model}"

    return frappe.db.sql(
		"""
        SELECT
            es.name,
            es.vin_serial_no,
            es.model,
            es.colour,
            es.description,
            se.posting_date
        FROM
            `tabVehicle Stock` es
        LEFT JOIN
            `tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
        LEFT JOIN
            `tabStock Entry` se ON se.name = sed.parent
        WHERE
            se.stock_entry_type = 'Material Receipt'
            AND es.model = %(model)s
            AND es.availability_status = %(availability_status)s
            AND es.colour = %(colour)s
            AND es.dealer = %(dealer)s
            -- only earliest receipt per serial
            AND se.name IN (
                SELECT MIN(se2.name)
                FROM `tabStock Entry` se2
                JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
                WHERE se2.stock_entry_type = 'Material Receipt'
                  AND sed2.serial_no = es.vin_serial_no
                GROUP BY sed2.serial_no
            )
            -- exclude VINs currently assigned to any non-cancelled Head Office Vehicle Orders
            AND NOT EXISTS (
                SELECT 1
                FROM `tabHead Office Vehicle Orders` hov
                WHERE hov.vinserial_no = es.vin_serial_no
                  AND hov.status != 'Cancelled'
            )
        ORDER BY
            se.posting_date ASC,
            se.posting_time ASC
    """,
		{"model": model, "availability_status": availability_status, "dealer": dealer, "colour": colour},
	)


@frappe.whitelist()
def head_office_orders_shipment_dialog_filter(model, availability_status, dealer):
	model = model
	availability_status = availability_status
	dealer = dealer

	return frappe.db.sql(
		"""
         SELECT
            esi.vin_serial_no,
            esi.model_code,
            esi.colour,
            esi.model_description,
            es.eta_warehouse,
            es.name,
            esi.target_warehouse
         FROM
            `tabVehicles Shipment` es
         LEFT JOIN
            `tabVehicles Shipment Items` esi ON esi.parent = es.name
         WHERE
            esi.vin_serial_no <> ''
            AND esi.model_code = %(model)s
            AND esi.status = 'Not Received'
            AND (esi.reserve_to_order is null OR esi.reserve_to_order = '')
         ORDER BY
            es.eta_warehouse ASC
      """,
		{"model": model, "availability_status": availability_status, "dealer": dealer},
	)


@frappe.whitelist()
def head_office_orders_fifo(model, availability_status, dealer):
	model = model
	availability_status = availability_status
	dealer = dealer

	return frappe.db.sql(
		"""
         SELECT
            es.name,
            es.vin_serial_no,
            es.model,
            es.colour,
            es.description,
            se.posting_date
         FROM
            `tabVehicle Stock` es
         LEFT JOIN
            `tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
         LEFT JOIN
            `tabStock Entry` se ON se.name = sed.parent
         WHERE
            se.stock_entry_type = 'Material Receipt'
            AND es.model = %(model)s
            AND es.availability_status = %(availability_status)s
            AND es.dealer = %(dealer)s
            AND NOT EXISTS (
                SELECT 1
                FROM `tabHead Office Vehicle Orders` ho
                WHERE ho.vinserial_no = es.vin_serial_no
            )
            AND se.name IN (
                SELECT MIN(se2.name)
                FROM `tabStock Entry` se2
                LEFT JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
                WHERE se2.stock_entry_type = 'Material Receipt'
                AND sed2.serial_no = es.vin_serial_no
                GROUP BY sed2.serial_no
            )
         ORDER BY
            se.posting_date ASC,
            se.posting_time ASC
         LIMIT 1
      """,
		{"model": model, "availability_status": availability_status, "dealer": dealer},
	)


@frappe.whitelist()
def shipment_vin_serial_check(vin_serial_no, shipment_name):
	vin_serial_list = json.loads(vin_serial_no)

	# Query to find VIN numbers present in other shipments
	result = frappe.db.sql(
		"""
        SELECT
            esi.vin_serial_no, es.name AS shipment_name
        FROM
            `tabVehicles Shipment Items` esi
        LEFT JOIN
            `tabVehicles Shipment` es ON esi.parent = es.name
        WHERE
            esi.vin_serial_no IN %(vin_serial_list)s
            AND es.name != %(shipment_name)s
    """,
		{"vin_serial_list": tuple(vin_serial_list), "shipment_name": shipment_name},
		as_dict=True,
	)

	if result:
		return result
	else:
		return None


@frappe.whitelist()
def back_order_custom_qry(doctype, txt, searchfield, start, page_len, filters):
    model = filters.get("model")
    colour = filters.get("colour")

    colour = frappe.get_value("Model Colour", colour, "colour")

    # frappe.throw(f"colour: {colour}")

    return frappe.db.sql(
		"""
        SELECT hq.name, hq.description, hq.model, hq.colour
        FROM `tabHead Office Vehicle Orders` hq
        WHERE
            hq.order_type = 'Back Order'
            AND (hq.{key} LIKE %(txt)s)
            AND hq.model = %(model)s
            AND hq.colour = %(colour)s
            And hq.vinserial_no IS NULL
        ORDER BY hq.order_datetime DESC
        LIMIT
            %(page_len)s OFFSET %(start)s
    """.format(
			**{
				"key": searchfield,
			}
		),
		{"txt": f"%{txt}%", "start": start, "page_len": page_len, "model": model, "colour": colour},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def part_rfc_order_filter(doctype, txt, searchfield, start, page_len, filters):
	part = filters.get("part")
	dealer = filters.get("dealer")

	return frappe.db.sql(
		"""
        SELECT
            po.name
        FROM
            `tabPart Order Item` poi
        LEFT JOIN
            `tabPart Order` po ON po.name = poi.parent
        WHERE
            po.dealer = %(dealer)s
            AND (po.{key} LIKE %(txt)s)
            AND poi.part_no = %(part)s
        LIMIT
            %(page_len)s OFFSET %(start)s
    """.format(
			**{
				"key": searchfield,
			}
		),
		{"txt": f"%{txt}%", "start": start, "page_len": page_len, "part": part, "dealer": dealer},
	)
