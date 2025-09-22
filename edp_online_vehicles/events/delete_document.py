import json

import frappe


@frappe.whitelist()
def delete_model_colours(colours, model):
	colours = json.loads(colours)

	# Iterate over the colours and construct the document names for deletion
	for colour in colours:
		doc_name = f"{colour} - {model}"

		if frappe.db.exists("Model Colour", doc_name):
			frappe.db.delete("Model Colour", {"name": doc_name})

	frappe.db.commit()

	return "Deleted colour successfully."
