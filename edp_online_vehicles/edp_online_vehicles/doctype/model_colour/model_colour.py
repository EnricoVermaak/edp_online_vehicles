# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ModelColour(Document):
	def on_update(self):
		self.name = self.colour + " - " + self.model
		model_name = self.model
		model_doc = frappe.get_doc("Model Administration", model_name)

		colour_exists = False

		for row in model_doc.model_colours:
			if row.colour == self.colour:
				row.model = self.model
				row.oem_colour_code = self.oem_colour_code
				row.naamsa_colour_code = self.naamsa_colour_code
				row.natis_colour_code = self.natis_colour_code
				row.discontinued = self.discontinued
				colour_exists = True
				break

		if not colour_exists:
			model_doc.append(
				"model_colours",
				{
					"model": self.model,
					"colour": self.colour,
					"oem_colour_code": self.oem_colour_code,
					"naamsa_colour_code": self.naamsa_colour_code,
					"natis_colour_code": self.natis_colour_code,
					"discontinued": self.discontinued,
				},
			)

		model_doc.save()
		frappe.db.commit()

	def autoname(self):
		self.name = f"{self.colour} - {self.model}"
