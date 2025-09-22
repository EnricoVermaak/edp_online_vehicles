import frappe
from frappe.utils import get_datetime, now_datetime


@frappe.whitelist()
def status_tracking(doc_id, status, previous_status, doctype):
	if not frappe.db.exists("Vehicle Status Tracking", {"status": status, "document_id": doc_id}):
		doc = frappe.new_doc("Vehicle Status Tracking")

		doc.status = status
		doc.document_id = doc_id
		doc.status_selected_datetime = now_datetime()
		doc.tracking_doc_doctype = doctype

		doc.insert(ignore_permissions=True)
	else:
		if frappe.db.exists("Vehicle Status Tracking", {"status": status, "document_id": doc_id}):
			tracking_doc_change_date = frappe.get_value(
				"Vehicle Status Tracking",
				{"status": status, "document_id": doc_id},
				["status_changed_datetime"],
			)
			tracking_doc_name = frappe.get_value(
				"Vehicle Status Tracking", {"status": status, "document_id": doc_id}, ["name"]
			)

			if tracking_doc_change_date:
				doc = frappe.new_doc("Vehicle Status Tracking")

				doc.status = status
				doc.document_id = doc_id
				doc.status_selected_datetime = now_datetime()
				doc.tracking_doc_doctype = doctype

				doc.insert(ignore_permissions=True)
			else:
				current_time = now_datetime()
				frappe.db.set_value(
					"Vehicle Status Tracking", tracking_doc_name, "status_changed_datetime", current_time
				)

				# Retrieve the updated document
				tracking_doc = frappe.get_doc("Vehicle Status Tracking", tracking_doc_name)
				# Convert the stored datetime strings to Python datetime objects
				selected_time = get_datetime(tracking_doc.status_selected_datetime)
				changed_time = get_datetime(tracking_doc.status_changed_datetime)

				# Calculate the time difference
				delta = changed_time - selected_time
				hours = delta.days * 24 + delta.seconds // 3600
				minutes = (delta.seconds % 3600) // 60

				time_elapsed = f"{hours} hours, {minutes} minutes"

				# Update the field that stores the elapsed time
				frappe.db.set_value(
					"Vehicle Status Tracking", tracking_doc_name, "time_elapsed_hoursminutes", time_elapsed
				)

	if frappe.db.exists("Vehicle Status Tracking", {"status": previous_status, "document_id": doc_id}):
		tracking_doc_change_date = frappe.get_value(
			"Vehicle Status Tracking",
			{"status": previous_status, "document_id": doc_id},
			["status_changed_datetime"],
		)
		tracking_doc_name = frappe.get_value(
			"Vehicle Status Tracking", {"status": previous_status, "document_id": doc_id}, ["name"]
		)

		if tracking_doc_change_date:
			doc = frappe.new_doc("Vehicle Status Tracking")

			doc.status = previous_status
			doc.document_id = doc_id
			doc.status_selected_datetime = now_datetime()
			doc.tracking_doc_doctype = doctype

			doc.insert(ignore_permissions=True)
		else:
			current_time = now_datetime()
			frappe.db.set_value(
				"Vehicle Status Tracking", tracking_doc_name, "status_changed_datetime", current_time
			)

			# Retrieve the updated document
			tracking_doc = frappe.get_doc("Vehicle Status Tracking", tracking_doc_name)
			# Convert the stored datetime strings to Python datetime objects
			selected_time = get_datetime(tracking_doc.status_selected_datetime)
			changed_time = get_datetime(tracking_doc.status_changed_datetime)

			# Calculate the time difference
			delta = changed_time - selected_time
			hours = delta.days * 24 + delta.seconds // 3600
			minutes = (delta.seconds % 3600) // 60

			time_elapsed = f"{hours} hours, {minutes} minutes"

			# Update the field that stores the elapsed time
			frappe.db.set_value(
				"Vehicle Status Tracking", tracking_doc_name, "time_elapsed_hoursminutes", time_elapsed
			)
	else:
		doc = frappe.new_doc("Vehicle Status Tracking")

		doc.status = previous_status
		doc.document_id = doc_id
		doc.status_selected_datetime = now_datetime()
		doc.tracking_doc_doctype = doctype

		doc.insert(ignore_permissions=True)

	frappe.db.commit()
