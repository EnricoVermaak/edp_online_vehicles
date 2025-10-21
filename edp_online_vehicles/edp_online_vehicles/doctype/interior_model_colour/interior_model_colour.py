# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class InteriorModelColour(Document):
    def on_update(self):
        self.name = f"{self.colour} - {self.model}"
        model_name = self.model
        model_doc = frappe.get_doc("Model Administration", model_name)

        colour_exists = False

        for row in model_doc.interior_colours:
            if row.colour == self.colour:
                row.model = self.model
                row.factory_colour_code = self.factory_colour_code
                row.discontinued = self.discontinued
                colour_exists = True
                break

        if not colour_exists:
            model_doc.append(
                "interior_colours",
                {
                    "model": self.model,
                    "colour": self.colour,
                    "factory_colour_code": self.factory_colour_code,
                    "discontinued": self.discontinued,
                },
            )

        model_doc.save()
        frappe.db.commit()

    def autoname(self):
        self.name = f"{self.colour} - {self.model}"