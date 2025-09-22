import frappe


@frappe.whitelist()
def delete_retail_2_chart():
	try:
		# Get the name (primary key) of the document
		chart = frappe.get_doc("Workspace Chart", {"chart_name": "Retail 2"})

		# Delete the document
		chart.delete()

		frappe.db.commit()  # Commit the transaction
		frappe.msgprint("Chart 'Retail 2' deleted successfully.")
	except frappe.DoesNotExistError:
		frappe.msgprint("Chart 'Retail 2' does not exist.")
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Error Deleting Workspace Chart")
		frappe.msgprint(f"An error occurred: {e!s}")


@frappe.whitelist()
def insert_retail_chart_in_vehicles():
	try:
		# Create a new Workspace Chart document
		chart = frappe.get_doc(
			{
				"doctype": "Workspace Chart",
				"chart_name": "Retail",  # This is the internal name of the chart
				"label": "Retail",  # This is the display label
				"parent_workspace": "Vehicles",  # Link it to the Vehicles workspace
			}
		)

		# Insert the document into the database
		chart.insert(ignore_permissions=True)
		frappe.db.commit()

		frappe.msgprint("Workspace Chart 'Retail' added to 'Vehicles' workspace.")
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Error Inserting Workspace Chart")
		frappe.msgprint(f"An error occurred: {e!s}")
