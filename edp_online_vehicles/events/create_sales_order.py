import frappe
from frappe.utils import today
from frappe.utils.data import get_link_to_form


@frappe.whitelist()
def create_sales_order_service(docname):
	doc = frappe.get_doc("Vehicles Service", docname)
	newdoc = frappe.new_doc("Sales Order")
	newdoc.custom_linked_service_id = docname
	newdoc.custom_vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.order_type = "Sales"
	newdoc.company = frappe.defaults.get_user_default("company")
	newdoc.transaction_date = today()
	newdoc.delivery_date = doc.part_schedule_date
	newdoc.custom_job_reference = doc.job_card_no

	for part in doc.service_parts_items:
		newdoc.append(
			"items",
			{
				"item_code": part.item,
				"item_name": part.description,
				"qty": part.qty,
				"uom": part.uom,
				"conversion_factor": 1,
				"base_amount": part.total_excl,
				"base_rate": part.price_excl,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Sales Order", newdoc.name)
	frappe.msgprint(f"New Sales Order is Created {newdoc_link}")


@frappe.whitelist()
def create_sales_order_warranty(docname, dealer_order_no=None):
	doc = frappe.get_doc("Vehicles Warranty Claims", docname)

	existing = frappe.db.exists("Part Order", {"warranty_claim": docname, "docstatus": ["!=", 2]})
	if existing:
		link = get_link_to_form("Part Order", existing)
		frappe.throw(f"A Part Order already exists for this warranty claim: {link}")

	approved_parts = [p for p in doc.part_items if p.approved and p.part_no]
	if not approved_parts:
		frappe.throw("No approved parts found on this warranty claim to order.")

	newdoc = frappe.new_doc("Part Order")
	newdoc.order_type = "Warranty"
	newdoc.warranty_claim = docname
	newdoc.dealer = doc.dealer
	newdoc.customer = doc.customer
	newdoc.dealer_order_no = dealer_order_no
	newdoc.order_date_time = frappe.utils.now_datetime()
	newdoc.delivery_date = doc.part_schedule_date or today()

	total_excl = 0
	for part in approved_parts:
		newdoc.append(
			"table_avsu",
			{
				"part_no": part.part_no,
				"description": part.description,
				"qty": part.qty or 1,
				"uom": part.uom,
				"dealer_billing_excl": part.price or 0,
				"total_excl": part.total_excl or 0,
				"order_from": "Warehouse",
			},
		)
		total_excl += part.total_excl or 0

	vat = round(total_excl * 0.15, 2)
	newdoc.total_excl = total_excl
	newdoc.vat = vat
	newdoc.total_incl = total_excl + vat

	newdoc.insert()
	newdoc_link = get_link_to_form("Part Order", newdoc.name)
	frappe.msgprint(f"Part Order created: {newdoc_link}")


@frappe.whitelist()
def create_sales_order_rfs(docname):
	doc = frappe.get_doc("Request for Service", docname)
	newdoc = frappe.new_doc("Sales Order")
	newdoc.custom_linked_rfs_id = docname
	newdoc.custom_vinserial_no = doc.vin_serial_no
	newdoc.customer = doc.customer
	newdoc.order_type = "Sales"
	newdoc.company = frappe.defaults.get_user_default("company")
	newdoc.transaction_date = today()
	newdoc.delivery_date = doc.part_schedule_date
	newdoc.custom_job_reference = doc.job_card_no

	for part in doc.parts:
		newdoc.append(
			"items",
			{
				"item_code": part.item,
				"item_name": part.description,
				"qty": part.qty,
				"uom": part.uom,
				"conversion_factor": 1,
				"base_amount": part.total_excl,
				"base_rate": part.price_excl,
			},
		)

	newdoc.insert()
	newdoc_link = get_link_to_form("Sales Order", newdoc.name)
	frappe.msgprint(f"New Sales Order is Created {newdoc_link}")


@frappe.whitelist()
def create_sales_order_hq_equip_sale(doc, event=None):
	com_doc = frappe.get_doc("Company", doc.order_placed_to)

	dealer_value = doc.order_placed_by

	if " - " in dealer_value:
		parts = dealer_value.split(" - ")
		dealer_code = parts[-1]
	else:
		dealer_code = dealer_value

	newdoc = frappe.new_doc("Sales Order")
	newdoc.custom_head_office_order_document_id = doc.name
	newdoc.customer = dealer_code
	newdoc.order_type = "Sales"
	newdoc.company = doc.order_placed_to
	newdoc.transaction_date = today()
	newdoc.delivery_date = doc.requested_delivery_date
	newdoc.set_warehouse = com_doc.custom_default_vehicles_stock_warehouse

	newdoc.append(
		"items",
		{
			"item_code": doc.model,
			"item_name": doc.description,
			"qty": 1,
			"uom": "Unit",
			"conversion_factor": 1,
			"base_amount": doc.price_excl,
			"base_rate": doc.price_excl,
			"custom_vinserial_no": doc.vinserial_no,
			"warehouse": com_doc.custom_default_vehicles_stock_warehouse,
		},
	)

	newdoc.insert(ignore_permissions=True)
	return


@frappe.whitelist()
def create_sales_order_dealer_equip_sale(doc, event=None):
	com_doc = frappe.get_doc("Company", doc.order_placed_to)

	newdoc = frappe.new_doc("Sales Order")
	newdoc.custom_dealer_to_dealer_order_document_id = doc.name
	newdoc.customer = doc.order_placed_by
	newdoc.order_type = "Sales"
	newdoc.company = doc.order_placed_to
	newdoc.transaction_date = today()
	newdoc.delivery_date = doc.requested_delivery_date
	newdoc.set_warehouse = com_doc.custom_default_vehicles_stock_warehouse

	newdoc.append(
		"items",
		{
			"item_code": doc.model,
			"item_name": doc.description,
			"qty": 1,
			"uom": "Unit",
			"conversion_factor": 1,
			"base_amount": doc.price_excl,
			"base_rate": doc.price_excl,
			"custom_vinserial_no": doc.vin_serial_no,
			"warehouse": com_doc.custom_default_vehicles_stock_warehouse,
		},
	)

	newdoc.insert(ignore_permissions=True)
	return
