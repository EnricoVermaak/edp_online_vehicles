import frappe


@frappe.whitelist()
def add_comment(docname, value):
	doc = frappe.get_doc("Request for Service", docname)
	doc.add_comment("Comment", f"Odo Reading updated from Service {value}")
	doc.save()


@frappe.whitelist()
def add_comments(doctype, docname, message):
	doc = frappe.get_doc(doctype, docname)
	doc.add_comment("Comment", message)
	doc.save()
	doc.submit()


@frappe.whitelist()
def get_dealers(model=None, colour=None):
    if not model or not colour:
        return []
    settings = frappe.get_single("Vehicle Stock Settings")
    allow = settings.allow_dealer_to_dealer_orders
    if allow:
        stock_dealers = frappe.get_all(
            "Vehicle Stock",
            filters={
                "model": model,
                "colour": colour,
                "availability_status": "Available"
            },
            pluck="dealer"
        )

        head_office_companies = frappe.get_all(
            "Company",
            filters={"custom_head_office": 1},
            pluck="name"
        )

        all_dealers = stock_dealers + head_office_companies

        all_dealers = list(set(all_dealers))

        return all_dealers