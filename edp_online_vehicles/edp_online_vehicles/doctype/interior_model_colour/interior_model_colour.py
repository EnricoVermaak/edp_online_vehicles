# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class InteriorModelColour(Document):
	def validate(self):
		duplicate = frappe.db.exists(
			"Interior Model Colour",
			{
				"model": self.model,
				"colour": self.colour,
				"name": ("!=", self.name)
			}
		)
		if duplicate:
			frappe.throw(f"Interior Model Colour '{self.colour}' - '{self.model}' already exists.")

	def on_update(self):
		self.name = f"{self.colour} - {self.model}"
		model_name = self.model
		model_doc = frappe.get_doc("Model Administration", model_name)

		child_table = "interior_colours"

		valid_colours = frappe.get_all(
			"Interior Model Colour",
			filters={"model": self.model},
			fields=["colour", "oem_colour_code", "naamsa_colour_code", "natis_colour_code", "discontinued"]
		)
		valid_colour_list = {c["colour"] for c in valid_colours}

		to_remove = [row for row in model_doc.get(child_table) if row.colour not in valid_colour_list]
		for row in to_remove:
			model_doc.remove(row)

		existing_rows = [row for row in model_doc.get(child_table) if row.colour == self.colour]
		for row in existing_rows:
			model_doc.remove(row)

		model_doc.append(
			child_table,
			{
				"model": self.model,
				"colour": self.colour,
				"oem_colour_code": self.oem_colour_code,
				"naamsa_colour_code": self.naamsa_colour_code,
				"natis_colour_code": self.natis_colour_code,
				"discontinued": self.discontinued,
			},
		)

		existing_child_colours = {row.colour for row in model_doc.get(child_table)}
		for c in valid_colours:
			if c["colour"] not in existing_child_colours:
				model_doc.append(
					child_table,
					{
						"model": self.model,
						"colour": c["colour"],
						"oem_colour_code": c.get("oem_colour_code"),
						"naamsa_colour_code": c.get("naamsa_colour_code"),
						"natis_colour_code": c.get("natis_colour_code"),
						"discontinued": c.get("discontinued"),
					},
				)

		model_doc.save()
		frappe.db.commit()

	def on_trash(self):
		if not self.model:
			return

		try:
			model_doc = frappe.get_doc("Model Administration", self.model)
			child_table = "interior_colours"

			rows_to_remove = [row for row in model_doc.get(child_table) if row.colour == self.colour]
			for row in rows_to_remove:
				model_doc.remove(row)

			model_doc.save()
			frappe.db.commit()

		except frappe.DoesNotExistError:
			pass

	def autoname(self):
		self.name = f"{self.colour} - {self.model}"
