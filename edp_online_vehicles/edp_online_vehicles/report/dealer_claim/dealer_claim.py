import frappe

def execute(filters=None):
    columns = [
        {"label": "Claim Number", "fieldname": "claim_number", "fieldtype": "Data", "width": 150},
        {"label": "Claim Category", "fieldname": "claim_category", "fieldtype": "Link", "options": "Dealer Claim Category", "width": 150},
        {"label": "Dealer", "fieldname": "dealer", "fieldtype": "Link", "options": "Company", "width": 150},
        {"label": "VIN", "fieldname": "vin", "fieldtype": "Data", "width": 150},
        {"label": "Claim Date/Time", "fieldname": "claim_datetime", "fieldtype": "Datetime", "width": 180},
        {"label": "Claim Type", "fieldname": "claim_type", "fieldtype": "Data", "width": 150},
        {"label": "Claim Amount", "fieldname": "claim_amount", "fieldtype": "Currency", "width": 150},
    ]

    data = []
    claims = frappe.get_all("Dealer Claims",
        fields=["name", "claim_category", "dealer", "claim_datetime", "claim_description", "claim_amt"],
        order_by="creation desc"
    )

    for claim in claims:
        # Fetch child table rows (Vehicles)
        vehicles = frappe.get_all("Vehicles Item", filters={"parent": claim.name}, fields=["vin_serial_no"])
        
        if vehicles:
            for v in vehicles:
                data.append({
                    "claim_number": claim.name,
                    "claim_category": claim.claim_category,
                    "dealer": claim.dealer,
                    "vin": v.vin_serial_no,
                    "claim_datetime": claim.claim_datetime,
                    "claim_type": claim.claim_description,
                    "claim_amount": claim.claim_amt
                })
        else:
            # If no vehicles, still add a row without VIN
            data.append({
                "claim_number": claim.name,
                "claim_category": claim.claim_category,
                "dealer": claim.dealer,
                "vin": "",
                "claim_datetime": claim.claim_datetime,
                "claim_type": claim.claim_description,
                "claim_amount": claim.claim_amt
            })

    return columns, data
