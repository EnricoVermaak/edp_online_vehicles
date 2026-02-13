import frappe


@frappe.whitelist()
def search_fleet_customer(reg_no):
	if frappe.db.exists("Fleet Customer", {"company_reg_no": reg_no}):
		return True


# @frappe.whitelist()
# def update_customer(customer_address, customer_mobile, customer_phone, customer_email):


@frappe.whitelist()
def get_fleet_cust_data(reg_no):
	# Remove all spaces from reg_no
	reg_no = reg_no.replace(" ", "")

	if frappe.db.exists("Fleet Customer", {"company_reg_no": reg_no}):
		data = frappe.db.get_value(
			"Fleet Customer",
			{"company_reg_no": reg_no},
			["name", "customer_name", "customer_surname", "mobile", "parts_discount", "vehicle_discount"],
		)
		if data: 
			return data
