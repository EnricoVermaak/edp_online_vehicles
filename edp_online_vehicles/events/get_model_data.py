import frappe


@frappe.whitelist()
def get_model_data(modelname):
	model_doc = frappe.get_doc("Model Administration", modelname)

	return model_doc
