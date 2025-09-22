import frappe


def attach_pdf(doc, event=None):
	print_format = "Delivery Note"

	# Prepare arguments for the execute function
	args = {
		"doctype": doc.doctype,
		"name": doc.name,
		"print_format": print_format,
	}

	# Execute the PDF generation and attachment
	execute(**args)


def execute(doctype, name, print_format):
	"""Generate PDF and attach it directly to the document."""
	# Get the document
	frappe.get_doc(doctype, name)

	# Generate the PDF data
	pdf_data = generate_pdf_data(doctype, name, print_format)

	# Attach the PDF directly to the document
	attach_pdf_to_doc(pdf_data, doctype, name)


def generate_pdf_data(doctype, name, print_format):
	"""Generate the PDF data from the document."""
	html = frappe.get_print(doctype, name, print_format)
	return frappe.utils.pdf.get_pdf(html)


def attach_pdf_to_doc(content, to_doctype, to_name):
	"""Attach the PDF content directly to the document."""
	file_name = f"{to_name}.pdf"

	# Create a new File document
	file = frappe.new_doc("File")
	file.file_name = file_name
	file.content = content
	file.is_private = 1
	file.attached_to_doctype = to_doctype
	file.attached_to_name = to_name
	file.save()
