import frappe

@frappe.whitelist(allow_guest=True)
def service_plans(vehicle_id):
	v=frappe.db.get_all("Vehicle Linked Service Plan",filters={"vin_serial_no":vehicle_id},fields=["name","service_km_hours_limit","service_period_limit_months","service_plan","status"])
	return [{"name": i.name, "service_km_hours_limit": i.service_km_hours_limit, "service_period_limit_months": i.service_period_limit_months, "service_plan": i.service_plan, "status": i.status}  for i in v]
      
      
    


@frappe.whitelist(allow_guest=True)
def warranty_plan(vehicle_id):
    r = frappe.get_all(
        "Vehicle Linked Warranty Plan",
        filters={"vin_serial_no": vehicle_id},
        fields=["warranty_plan","warranty_period_months","warranty_limit_km_hours","status"]
    )
    return [
        {"warranty_plan_description": i.warranty_plan, "warranty_period_months": i.warranty_period_months, "warranty_limit_km_hours": i.warranty_limit_km_hours, "status": i.status}
        for i in r
    ]


@frappe.whitelist()
def get_history(vehicle_id):
    v = frappe.db.get_all(
        "Vehicles Warranty Claims",
        filters={"vin_serial_no": vehicle_id},
        fields=["name","odo_reading","status","date_of_failure"],
    )
    return [{"document_no": i.name, "odo_reading": i.odo_reading, "status": i.status, "date_of_failure": i.date_of_failure}  for i in v]

@frappe.whitelist()
def get_vehicle_details(vehicle_id):
    v = frappe.db.get_all(
        "Vehicle Service History",
        filters={"vin_serial_no": vehicle_id},
        fields=["name","service_date","service_type","dealer","odo_reading_hours","service_date","service_status"],
    )
    return [{"document_no": i.name, "service_date": i.service_date, "service_type": i.service_type, "dealer": i.dealer, "odo_readinghours": i.odo_reading_hours,"status": i.service_status}  for i in v]

