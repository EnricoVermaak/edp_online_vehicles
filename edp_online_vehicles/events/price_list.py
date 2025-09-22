import frappe


@frappe.whitelist()
def get_price(item, price_list=None):
	if not price_list:
		frappe.throw("Customer didn't have any pricelist")
	query = f"""SELECT `price_list_rate` FROM `tabItem Price`
	WHERE `item_code`='{item}' AND `price_list`='{price_list}' ORDER BY `valid_from` DESC"""

	price_details = frappe.db.sql(query, as_dict=True)
	price = price_details[0].price_list_rate if len(price_details) else 0
	return price
