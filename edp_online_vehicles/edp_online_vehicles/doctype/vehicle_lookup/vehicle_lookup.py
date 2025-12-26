# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VehicleLookup(Document):
	pass






@frappe.whitelist()
def get_vehicle_details(vehicle_id):
    v = frappe.db.get_all(
        "Vehicle Service History",
        filters={"vin_serial_no": vehicle_id},
        fields=["name","service_date","service_type","dealer","odo_reading_hours","service_date","service_status"],
    )
    return [{"document_no": i.name, "service_date": i.service_date, "service_type": i.service_type, "dealer": i.dealer, "odo_readinghours": i.odo_reading_hours,"status": i.service_status}  for i in v]



