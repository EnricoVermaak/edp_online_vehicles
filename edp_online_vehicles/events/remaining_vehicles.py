import frappe

@frappe.whitelist()
def get_remaining_vehicles(vehicle_id):
	vehicle_doc = frappe.get_doc("Vehicle Stock", vehicle_id)
	model = vehicle_doc.model
	description = vehicle_doc.description
	all_schedules = frappe.get_all("Service Schedules",{"model_code": model, "model_description": description}, ["name"])

	vehicle_services = frappe.get_all(
		"Vehicles Service",
		fields=["service_type"],
		filters={"vin_serial_no": vehicle_id, "service_status": ["!=", "Pending"]}
	)
	remaining_schedules = list(
        {s.name for s in all_schedules}
        - {v.service_type for v in vehicle_services}
    )
	return remaining_schedules