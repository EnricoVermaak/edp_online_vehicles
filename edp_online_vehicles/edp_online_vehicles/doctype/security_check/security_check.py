# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
from PIL import Image


class SecurityCheck(Document):
	@frappe.whitelist()
	def decode_sa_dl(image_path):
		"""
		Open the image at `image_path`, decode any PDF417 barcodes,
		and return a dict of all 3-letter AAMVA fields → their values.
		"""
		Image.open(image_path)
		codes = ""
		if not codes:
			raise ValueError(f"No PDF417 barcode found in {image_path}")

		# We take the first decoded barcode
		raw = codes[0]["text"]

		# Strip any leading group separator
		raw = raw.lstrip("\x1e")

		# Split on the group separator (ASCII 30)
		segments = raw.split("\x1e")

		result = {}
		for seg in segments:
			if len(seg) < 4:
				continue
			code = seg[:3]
			value = seg[3:].strip()
			result[code] = value
		return result
