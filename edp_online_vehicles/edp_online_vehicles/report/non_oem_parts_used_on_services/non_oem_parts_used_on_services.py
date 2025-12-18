# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    """
    Script Report: Non OEM Labour Used on Vehicles Service
    Shows only labour items which do not exist in Item Doctype
    """
    if filters is None:
        filters = {}

    columns = [
        "Service Number:Link/Vehicles Service:150",
        "Vehicle:Data:120",
        "Service Date:Data:120",
        "Part Number:Data:120",
        "Part Description:Data:120",
        "Quantity:Data:120",
        "Dealer:Data:120"
            ]

    data = []

    # Filters for parent Vehicles Service
    vs_filters = []
    if filters.get("vin_serial_no"):
        vs_filters.append(["vin_serial_no", "=", filters.get("vin_serial_no")])
    if filters.get("dealer"):
        vs_filters.append(["dealer", "=", filters.get("dealer")])
    if filters.get("from_date"):
        vs_filters.append(["creation", ">=", filters.get("from_date")])
    if filters.get("to_date"):
        vs_filters.append(["creation", "<=", filters.get("to_date")])

    # Get Vehicles Service documents
    vehicles_services = frappe.get_all("Vehicles Service", filters=vs_filters, fields=[
        "name", "vin_serial_no", "odo_reading_hours", "service_type",
        "service_status", "dealer", "customer", "job_card_no", "service_date"
    ])

    for vs in vehicles_services:
        doc = frappe.get_doc("Vehicles Service", vs.name)
        for labour in doc.service_parts_items:
            if not labour.item:  # Non-existing item
                data.append([
                    doc.name,
                    doc.vin_serial_no,
                    doc.service_date,
                    labour.non_oem,
                    labour.descrip,
                    labour.qty,
                    doc.dealer
                ])

    return columns, data
