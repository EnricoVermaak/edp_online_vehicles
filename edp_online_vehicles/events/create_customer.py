import frappe


@frappe.whitelist()
def create_customer_if_checked(doc, method=None):
	if doc.custom_create_customer_and_supplier and doc.custom_customer_code:
		create_customer(doc)


@frappe.whitelist()
def create_customer(doc):
	cust_doc = frappe.new_doc("Customer")
	cust_doc.customer_name = doc.company_name
	cust_doc.custom_customer_code = doc.custom_customer_code
	cust_doc.customer_group = "Dealer Network"

	cust_doc.insert(ignore_permissions=True)
	cust_doc.submit()

	frappe.db.commit()
	# frappe.publish_realtime("refresh")


@frappe.whitelist()
def create_fleet_customer(
	customer_type,
	company,
	company_name,
	company_reg_no,
	customer_name,
	customer_surname,
	gender,
	mobile,
	email,
	address,
	suburb,
	city_town,
	country,
	province_state,
	code,
	would_you_like_to_receive_marketing_updates_via_SMS,
	would_you_like_to_receive_marketing_updates_via_email,
	would_you_like_to_receive_marketing_updates_via_post,
	did_you_confirm_all_popi_regulations_with_your_customer,
):
	fleet_cust_doc = frappe.new_doc("Fleet Customer")

	fleet_cust_doc.customer_type = customer_type
	fleet_cust_doc.company = company
	fleet_cust_doc.company_name = company_name
	fleet_cust_doc.company_reg_no = company_reg_no
	fleet_cust_doc.customer_name = customer_name
	fleet_cust_doc.customer_surname = customer_surname
	fleet_cust_doc.gender = gender
	fleet_cust_doc.mobile = mobile
	fleet_cust_doc.email = email
	fleet_cust_doc.address = address
	fleet_cust_doc.suburb = suburb
	fleet_cust_doc.city_town = city_town
	fleet_cust_doc.country = country
	fleet_cust_doc.province_state = province_state
	fleet_cust_doc.code = code
	fleet_cust_doc.check_qvlp = would_you_like_to_receive_marketing_updates_via_SMS
	fleet_cust_doc.would_you_like_to_receive_marketing_updates_via_email = (
		would_you_like_to_receive_marketing_updates_via_email
	)
	fleet_cust_doc.would_you_like_to_receive_marketing_updates_via_post = (
		would_you_like_to_receive_marketing_updates_via_post
	)
	fleet_cust_doc.did_you_confirm_all_popi_regulations_with_your_customer = (
		did_you_confirm_all_popi_regulations_with_your_customer
	)

	# fleet_cust_doc.customer_type = customer_type
	# fleet_cust_doc.fleet_code = fleet_code
	# fleet_cust_doc.customer_name = customer_name
	# fleet_cust_doc.customer_surname = customer_surname
	# fleet_cust_doc.id_no = id_no
	# fleet_cust_doc.mobile = mobile
	# fleet_cust_doc.email = email
	# fleet_cust_doc.check_qvlp = would_you_like_to_receive_marketing_updates_via_SMS
	# fleet_cust_doc.would_you_like_to_receive_marketing_updates_via_email = would_you_like_to_receive_marketing_updates_via_email
	# fleet_cust_doc.would_you_like_to_receive_marketing_updates_via_post = would_you_like_to_receive_marketing_updates_via_post
	# fleet_cust_doc.did_you_confirm_all_popi_regulations_with_your_customer = did_you_confirm_all_popi_regulations_with_your_customer

	fleet_cust_doc.insert(ignore_permissions=True)

	frappe.db.commit()

	return fleet_cust_doc.name
