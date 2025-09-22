import frappe


@frappe.whitelist()
def delete_docs(doctype):
	frappe.db.delete(doctype, {"name": "BSDBN54635"})
	frappe.db.commit()  # Ensure changes are saved


@frappe.whitelist()
def delete_doc():
	doc_names = ["ESHP-0125-0000001790"]

	frappe.db.delete("Vehicles Shipment", {"name": ["in", doc_names]})
	frappe.db.commit()


@frappe.whitelist()
def delete_customer():
	# Fetch all document names (or IDs) from 'Vehicle Stock' where status is 'Available'
	docs = frappe.get_all("Vehicle Stock", filters={"availability_status": "Available"}, fields=["name"])

	for doc in docs:
		# Fetch the full document object using get_doc
		vehicle_stock_doc = frappe.get_doc("Vehicle Stock", doc["name"])

		# Set the customer field to None
		vehicle_stock_doc.address = None
		vehicle_stock_doc.email = None
		vehicle_stock_doc.phone = None
		vehicle_stock_doc.customer_full_name = None

		# Save the updated document
		vehicle_stock_doc.save()

		# Commit changes to the database
		frappe.db.commit()  # Ensure changes persist in the database
