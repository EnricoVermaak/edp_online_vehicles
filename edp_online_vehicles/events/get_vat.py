import frappe
from frappe.utils import flt


@frappe.whitelist()
def get_vat(company):
	tname = frappe.db.get_value("Item Tax Template", {"company": company}, "name")
	com_doc = frappe.get_doc("Company", company)
	if tname:
		tmpl = frappe.get_doc("Item Tax Template", tname)
		label = "VAT - " + (com_doc.abbr or "")
		for tr in tmpl.taxes or []:
			if tr.tax_type == label:
				vat_rate = flt(tr.tax_rate or 0)
				break

	if vat_rate:
		return vat_rate
