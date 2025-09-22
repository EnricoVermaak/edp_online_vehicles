import frappe


@frappe.whitelist()
def get_model_colour(vinno):
	stock_doc = frappe.get_doc("Vehicle Stock", vinno)

	if stock_doc:
		colour = stock_doc.colour

		# Remove the part after the hyphen
		colour = colour.split(" -")[0]

		return colour
