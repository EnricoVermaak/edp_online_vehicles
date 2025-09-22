import frappe
from frappe.query_builder.functions import IfNull, Sum
from frappe.utils import flt


@frappe.whitelist()
def get_item_details(part_no):
	# Query stock levels for the item from warehouses that have actual_qty > 0
	stock_data = frappe.db.sql(
		"""
        SELECT w.company, SUM(b.actual_qty) AS soh
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON b.warehouse = w.name
        WHERE b.item_code = %s
          AND b.actual_qty > 0
          AND w.company IN (SELECT name FROM `tabCompany`)  -- Ensuring company is active
        GROUP BY w.company
        """,
		(part_no,),
		as_dict=True,
	)

	# Get the HQ company (assume only one Company has custom_head_office checked)
	hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")

	# Create a dictionary for easier lookup from stock_data
	stock_dict = {row["company"]: row["soh"] for row in stock_data}

	# Ensure HQ is present: if not found, soh will be 0.
	hq_soh = stock_dict.pop(hq_company, 0)

	# Build result with HQ as the first entry. Add allow_backorder flag for HQ.
	result = [{"company": hq_company, "soh": hq_soh, "allow_backorder": True}]

	# Append the remaining companies from the query, with backorder disabled.
	for company, soh in stock_dict.items():
		result.append({"company": company, "soh": soh, "allow_backorder": False})

	return result


@frappe.whitelist()
def get_stock_availability(item_code, warehouse):
	if frappe.db.get_value("Item", item_code, "is_stock_item"):
		is_stock_item = True
		bin_qty = get_bin_qty(item_code, warehouse)
		pos_sales_qty = get_pos_reserved_qty(item_code, warehouse)

		return bin_qty - pos_sales_qty, is_stock_item
	else:
		is_stock_item = True
		if frappe.db.exists("Product Bundle", {"name": item_code, "disabled": 0}):
			return get_bundle_availability(item_code, warehouse), is_stock_item
		else:
			is_stock_item = False
			# Is a service item or non_stock item
			return 0, is_stock_item


def get_bin_qty(item_code, warehouse):
	bin_qty = frappe.db.sql(
		"""select actual_qty from `tabBin`
		where item_code = %s and warehouse = %s
		limit 1""",
		(item_code, warehouse),
		as_dict=1,
	)

	return bin_qty[0].actual_qty or 0 if bin_qty else 0


def get_pos_reserved_qty(item_code, warehouse):
	p_inv = frappe.qb.DocType("POS Invoice")
	p_item = frappe.qb.DocType("POS Invoice Item")

	reserved_qty = (
		frappe.qb.from_(p_inv)
		.from_(p_item)
		.select(Sum(p_item.stock_qty).as_("stock_qty"))
		.where(
			(p_inv.name == p_item.parent)
			& (IfNull(p_inv.consolidated_invoice, "") == "")
			& (p_item.docstatus == 1)
			& (p_item.item_code == item_code)
			& (p_item.warehouse == warehouse)
		)
	).run(as_dict=True)

	return flt(reserved_qty[0].stock_qty) if reserved_qty else 0


def get_bundle_availability(bundle_item_code, warehouse):
	product_bundle = frappe.get_doc("Product Bundle", bundle_item_code)

	bundle_bin_qty = 1000000
	for item in product_bundle.items:
		item_bin_qty = get_bin_qty(item.item_code, warehouse)
		item_pos_reserved_qty = get_pos_reserved_qty(item.item_code, warehouse)
		available_qty = item_bin_qty - item_pos_reserved_qty

		max_available_bundles = available_qty / item.qty
		if bundle_bin_qty > max_available_bundles and frappe.get_value(
			"Item", item.item_code, "is_stock_item"
		):
			bundle_bin_qty = max_available_bundles

	pos_sales_qty = get_pos_reserved_qty(bundle_item_code, warehouse)
	return bundle_bin_qty - pos_sales_qty
