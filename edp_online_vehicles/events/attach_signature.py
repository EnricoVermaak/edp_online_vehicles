import base64
from io import BytesIO

import frappe
from PIL import Image, ImageOps
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


@frappe.whitelist()
def add_quotation_signatures_to_pdf(docname):
	# Load the PDF from the attachment field in Request for Service
	quotation_document = frappe.db.get_value("Request for Service", docname, "quotation_document")
	if not quotation_document:
		return

	# Get the PDF file path
	pdf_file_path = frappe.get_site_path("public", quotation_document.lstrip("/"))

	# Open the PDF
	pdf_reader = PdfReader(pdf_file_path)
	PdfWriter()

	# Get signature field data and convert them to images
	quote_signature_data = frappe.db.get_value("Request for Service", docname, "quote_preapproval_signature")
	final_signature_data = frappe.db.get_value("Request for Service", docname, "final_approval_signature")

	# Function to decode signature data
	def decode_signature(signature_data):
		if not signature_data:
			return None
		signature_data = signature_data.split(",")[1] if "," in signature_data else signature_data
		return Image.open(BytesIO(base64.b64decode(signature_data)))

	# Function to process the signature image
	def process_signature_image(signature_image):
		if signature_image:
			# Convert to grayscale
			gray_image = signature_image.convert("L")

			# Invert colors: black becomes white and vice versa
			inverted_image = ImageOps.invert(gray_image)

			# Create a white background image
			white_background = Image.new("L", inverted_image.size, 255)

			# Apply a threshold to enhance the signature
			threshold_value = 200
			darkened_signature = inverted_image.point(lambda x: 0 if x < threshold_value else 255)

			# Combine the images: keep the darkened signature and make the background white
			final_signature_image = Image.composite(white_background, darkened_signature, darkened_signature)

			return final_signature_image
		return None

	# Decode signatures
	quote_signature_img = decode_signature(quote_signature_data)
	final_signature_img = decode_signature(final_signature_data)

	if quote_signature_img:
		quote_signature_img = process_signature_image(quote_signature_img)
		quote_signature_path = "/tmp/quote_signature.png"
		quote_signature_img.save(quote_signature_path, "PNG")

	if final_signature_img:
		final_signature_img = process_signature_image(final_signature_img)
		final_signature_path = "/tmp/final_signature.png"
		final_signature_img.save(final_signature_path, "PNG")

	# Flag to check if signature page exists
	signature_page_exists = False
	signature_page_index = None

	# Check for the signature page by looking for "Quotation Signatures:" at the top
	for page_num, page in enumerate(pdf_reader.pages):
		page_text = page.extract_text()
		if page_text and page_text.startswith("Quotation Signatures:"):
			signature_page_exists = True
			signature_page_index = page_num
			break

	# Prepare to create a new PdfWriter to retain all pages
	updated_pdf_writer = PdfWriter()

	# Add all pages from the original PDF to the new writer
	for page_num, page in enumerate(pdf_reader.pages):
		if signature_page_exists and page_num == signature_page_index:
			# Prepare the new signature page
			packet = BytesIO()
			can = canvas.Canvas(packet, pagesize=letter)

			# Add text identifier at the top of the signature page
			can.drawString(50, 750, "Quotation Signatures:")

			# Position signatures at desired coordinates (adjust x and y as needed)
			quote_x, quote_y = 100, 600
			final_x, final_y = 300, 600

			if quote_signature_img:
				can.drawImage(quote_signature_path, quote_x, quote_y, width=200, height=100)
			if final_signature_img:
				can.drawImage(final_signature_path, final_x, final_y, width=200, height=100)

			can.save()

			# Move to the beginning of the BytesIO stream
			packet.seek(0)
			signature_pdf = PdfReader(packet)
			new_signature_page = signature_pdf.pages[0]

			# Add the new signature page to the writer instead of the old one
			updated_pdf_writer.add_page(new_signature_page)
		else:
			# Add the original page if it's not the signature page
			updated_pdf_writer.add_page(page)

	# Save the modified PDF to the attachment field
	output_stream = BytesIO()
	updated_pdf_writer.write(output_stream)
	output_stream.seek(0)

	# Replace the old PDF file with the updated one
	with open(pdf_file_path, "wb") as f:
		f.write(output_stream.read())

	frappe.db.commit()

	return "Quotation Signatures added successfully"


@frappe.whitelist()
def add_invoice_signatures_to_pdf(docname):
	# Load the PDF from the attachment field in Request for Service
	invoice_document = frappe.db.get_value("Request for Service", docname, "invoice_document")
	if not invoice_document:
		return

	# Get the PDF file path
	pdf_file_path = frappe.get_site_path("public", invoice_document.lstrip("/"))

	# Open the PDF
	pdf_reader = PdfReader(pdf_file_path)
	updated_pdf_writer = PdfWriter()

	# Get signature field data and convert them to images
	invoice_signature_data = frappe.db.get_value("Request for Service", docname, "invoice_approval_signature")

	# Function to decode signature data
	def decode_signature(signature_data):
		if not signature_data:
			return None
		signature_data = signature_data.split(",")[1] if "," in signature_data else signature_data
		return Image.open(BytesIO(base64.b64decode(signature_data)))

	# Function to process the signature image
	def process_signature_image(signature_image):
		if signature_image:
			# Convert to grayscale
			gray_image = signature_image.convert("L")

			# Invert colors: black becomes white and vice versa
			inverted_image = ImageOps.invert(gray_image)

			# Create a white background image
			white_background = Image.new("L", inverted_image.size, 255)

			# Apply a threshold to enhance the signature
			threshold_value = 200
			darkened_signature = inverted_image.point(lambda x: 0 if x < threshold_value else 255)

			# Combine the images: keep the darkened signature and make the background white
			final_signature_image = Image.composite(white_background, darkened_signature, darkened_signature)

			return final_signature_image
		return None

	# Decode signatures
	invoice_signature_img = decode_signature(invoice_signature_data)

	if invoice_signature_img:
		invoice_signature_img = process_signature_image(invoice_signature_img)
		invoice_signature_path = "/tmp/invoice_signature.png"
		invoice_signature_img.save(invoice_signature_path, "PNG")

	# Flag to check if signature page exists
	signature_page_index = None

	# Check for the signature page by looking for "Invoice Signatures:" at the top
	for page_num, page in enumerate(pdf_reader.pages):
		page_text = page.extract_text()
		if page_text and page_text.startswith("Invoice Signatures:"):
			signature_page_index = page_num
			break

	# Add all pages from the original PDF to the new writer
	for page_num, page in enumerate(pdf_reader.pages):
		if signature_page_index is not None and page_num == signature_page_index:
			# Prepare to update the existing signature page
			packet = BytesIO()
			can = canvas.Canvas(packet, pagesize=letter)

			# Add text identifier at the top of the signature page
			can.drawString(50, 750, "Invoice Signatures:")

			# Position signatures at desired coordinates (adjust x and y as needed)
			if invoice_signature_img:
				can.drawImage(invoice_signature_path, 100, 600, width=200, height=100)

			can.save()

			# Move to the beginning of the BytesIO stream
			packet.seek(0)
			signature_pdf = PdfReader(packet)
			updated_signature_page = signature_pdf.pages[0]

			# Add the updated signature page to the writer
			updated_pdf_writer.add_page(updated_signature_page)
		else:
			# Add the original page if it's not the signature page
			updated_pdf_writer.add_page(page)

	# If no signature page was found, create a new signature page
	if signature_page_index is None:
		# Create a new signature page
		packet = BytesIO()
		can = canvas.Canvas(packet, pagesize=letter)

		# Add text identifier for the new signature page
		can.drawString(50, 750, "Invoice Signatures:")

		# Position signatures at desired coordinates
		if invoice_signature_img:
			can.drawImage(invoice_signature_path, 100, 600, width=200, height=100)

		can.save()

		# Move to the beginning of the BytesIO stream
		packet.seek(0)
		signature_pdf = PdfReader(packet)
		new_signature_page = signature_pdf.pages[0]

		# Add the new signature page at the end
		updated_pdf_writer.add_page(new_signature_page)

	# Save the modified PDF to the attachment field
	output_stream = BytesIO()
	updated_pdf_writer.write(output_stream)
	output_stream.seek(0)

	# Replace the old PDF file with the updated one
	with open(pdf_file_path, "wb") as f:
		f.write(output_stream.read())

	frappe.db.commit()

	return "Invoice Signatures added successfully"
