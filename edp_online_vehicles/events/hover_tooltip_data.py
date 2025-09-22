import frappe


@frappe.whitelist()
def order_model_hover_data(model):
	# Fetch the Model Administration document
	model_doc = frappe.get_doc("Model Administration", model)

	# Fetch the first image attached to the document
	image = (
		frappe.db.get_value(
			"File",
			{"attached_to_doctype": "Model Administration", "attached_to_name": model, "is_private": 0},
			"file_url",
		)
		or ""
	)

	return {
		"image": image,
		"model_name": model_doc.name,
		"description": model_doc.model_description,
		"brand": model_doc.brand,
		"category": model_doc.category,
		"model_year": model_doc.model_year,
	}


@frappe.whitelist()
def set_model_admin_image(model):
	img = frappe.db.get_single_value("Vehicle Stock Settings", "default_model_image")

	return img
