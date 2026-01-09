import frappe


@frappe.whitelist()
def dealer_claim_duplicate_check(vinno, dealer, claim_type_code, docname):
	if vinno:
		vinno = vinno
		dealer = dealer
		claim_type_code = claim_type_code

		return frappe.db.sql(
			"""
                SELECT
                    dc.name
                FROM
                    `tabDealer Claims` dc
                LEFT JOIN
                    `tabVehicles Item` vi ON vi.parent = dc.name
                WHERE
                    dc.dealer = %(dealer)s
                    AND vi.vin_serial_no = %(vinno)s
                    AND dc.claim_type_code = %(claim_type_code)s
                    AND dc.name != %(docname)s
                    AND dc.claim_status != 'Cancelled'
        """,
			{"dealer": dealer, "vinno": vinno, "claim_type_code": claim_type_code, "docname": docname},
		)


@frappe.whitelist()
def dealer_claim_vehicle_check(dealer, original_purchasing_dealer=None):
	claimed_vinnos = []

	claim_doc_names = frappe.get_all("Dealer Claims", filters={"dealer": ["!=", dealer]}, pluck="name")

	if original_purchasing_dealer:
		stock_doc_names = frappe.get_all(
			"Vehicle Stock",
			filters={"original_purchasing_dealer": ["!=", original_purchasing_dealer], "dealer": dealer},
			pluck="name",
		)

		claimed_vinnos = stock_doc_names

	for doc_name in claim_doc_names:
		claim_doc = frappe.get_doc("Dealer Claims", doc_name)
		if claim_doc:
			for row in claim_doc.table_exgk:
				if row.vin_serial_no:
					claimed_vinnos.append(row.vin_serial_no)

	return claimed_vinnos
