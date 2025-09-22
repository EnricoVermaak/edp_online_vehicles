import frappe


@frappe.whitelist()
def get_latest_contract_details(vinno):
	child_docs = frappe.get_all("Contract Vehicles Items", filters={"vinserial_no": vinno}, fields=["parent"])

	parent_names = [doc["parent"] for doc in child_docs]

	if parent_names:
		parent_contracts = frappe.get_all(
			"Contract",
			filters={"name": ["in", parent_names]},
			fields=["name", "custom_contract_status", "start_date", "end_date"],
			order_by="creation desc",
			limit=1,
		)

		return parent_contracts
	else:
		return []
