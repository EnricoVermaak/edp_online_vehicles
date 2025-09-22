import frappe


@frappe.whitelist()
def apply_vehicle_microdot_query(frm):
	frm.set_query("microdot", set_microdot_query)


@frappe.whitelist()
def set_microdot_query():
	return {"filters": {"status": "Received"}}


@frappe.whitelist()
def get_users(dealer):
	user = []

	records = frappe.get_all("User Permission", fields=["user", "for_value"])

	for record in records:
		if record["for_value"] == dealer:
			user.append(record["user"])

	return user


@frappe.whitelist()
def get_dealers(user):
	dealers = []

	records = frappe.get_all("User Permission", fields=["user", "for_value"])

	for record in records:
		if record["user"] == user:
			dealers.append(record["for_value"])

	return dealers
