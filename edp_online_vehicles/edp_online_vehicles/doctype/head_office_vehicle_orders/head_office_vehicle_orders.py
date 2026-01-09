# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from edp_online_vehicles.events.auto_move_stock import auto_move_stock_hq, auto_move_stock_hq_transit
from frappe.desk.doctype.tag.tag import remove_tag

try:
	from edp_api.api.TAC.tac_integration import tac_delivery_outgoing
except (ImportError, ModuleNotFoundError):
	tac_delivery_outgoing = None

from frappe.model.document import Document
from frappe.utils import now_datetime


class HeadOfficeVehicleOrders(Document):
	def validate(self):
		move_stock = frappe.db.get_value("Vehicles Order Status", {"name": self.status}, "auto_move_stock")
		in_transit = frappe.db.get_value(
			"Vehicles Order Status", {"name": self.status}, "in_transit_warehouse"
		)

		if move_stock:
			if self.vinserial_no:
				stock_doc = frappe.get_doc("Vehicle Stock", self.vinserial_no)

				if stock_doc.dealer == self.order_placed_to:
					auto_move_stock_hq(
						self.vinserial_no,
						self.order_placed_to,
						self.order_placed_by,
						self.model,
						self.price_excl,
					)

		if in_transit:
			if self.vinserial_no:
				auto_move_stock_hq_transit(
					self.vinserial_no, self.order_placed_to, self.order_placed_by, self.model, self.price_excl
				)

	def on_update(self):
		submit_doc = frappe.db.get_value(
			"Vehicles Order Status", {"name": self.status}, "automatically_submit_document"
		)

		if submit_doc:
			self.submit()

	def before_submit(self):
		if self.status != "Delivered" or self.status != "Canceled":
			frappe.throw(
				"You cannot submit this Order as it's status hasn't been marked 'Delivered', or 'Cancelled'"
			)

	def after_insert(self):
		stock_fifo_orders = frappe.db.get_single_value(
			"Vehicle Stock Settings", "apply_fifo_rule_on_vehicles_orders"
		)

		today_day = datetime.today().day

		colour = self.colour + " - " + self.model

		if stock_fifo_orders:
			if not self.vinserial_no:
				# Get FIFO allocate dates from Vehicles Order Purpose
				fifo_from_date = frappe.db.get_value(
					"Vehicles Order Purpose", {"name": self.purpose}, "allocate_from_date"
				)
				fifo_to_date = frappe.db.get_value(
					"Vehicles Order Purpose", {"name": self.purpose}, "allocate_to_date"
				)

				# Apply FIFO logic if there is no valid date restriction or if today is within the valid window.
				if (not (fifo_from_date and fifo_to_date and fifo_from_date > 0 and fifo_to_date > 0)) or (
					fifo_from_date <= today_day <= fifo_to_date
				):
					result = frappe.db.sql(
						"""
						SELECT
							es.name,
							es.vin_serial_no,
							es.model,
							es.colour,
							es.description,
							es.engine_no,
							se.posting_date
						FROM
							`tabVehicle Stock` es
						LEFT JOIN
							`tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
						LEFT JOIN
							`tabStock Entry` se ON se.name = sed.parent
						WHERE
							se.stock_entry_type = 'Material Receipt'
							AND es.model = %(model)s
							AND es.colour = %(colour)s
							AND es.availability_status = %(availability_status)s
							AND es.dealer = %(dealer)s
							AND NOT EXISTS (
								SELECT 1
								FROM `tabHead Office Vehicle Orders` ho
								WHERE ho.vinserial_no = es.vin_serial_no
							)
						AND se.name IN (
							SELECT MIN(se2.name)
							FROM `tabStock Entry` se2
							LEFT JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
							WHERE se2.stock_entry_type = 'Material Receipt'
							AND sed2.serial_no = es.vin_serial_no
							GROUP BY sed2.serial_no
						)
						ORDER BY
							se.posting_date ASC,
							se.posting_time ASC
						LIMIT 1
					""",
						{
							"model": self.model,
							"colour": colour,
							"availability_status": "Available",
							"dealer": self.order_placed_to,
						},
					)

					if result and len(result) > 0:
						vin_number = result[0][1]
						model = result[0][2]
						colour = result[0][3]
						description = result[0][4]
						engine_no = result[0][5]

						formatted_colour = colour.split(" - ")[0]

						if vin_number:
							self.vinserial_no = vin_number
							self.model_delivered = model
							self.model_description = description
							self.colour_delivered = formatted_colour
							self.engine_no = engine_no
							self.status = "Processed"

							self.allocate_vinno()



							user_company = frappe.defaults.get_user_default("Company")
							head_office = frappe.get_value("Company", {"custom_head_office": 1}, "name")


							if user_company == head_office:
								create_integration_doc = frappe.db.get_value(
									"Vehicles Order Status", {"name": self.status}, "create_integration_file"
								)
								if create_integration_doc and tac_delivery_outgoing:
									if self.vinserial_no:
										try:
											tac_delivery_outgoing(
												self.vinserial_no,
												self.model_delivered,
												self.model_description,
												self.colour_delivered,
												self.order_placed_by,
											)
										except Exception as e:
											frappe.log_error(
												f"Failed to create TAC delivery file for order {self.name}, VIN {self.vinserial_no}: {str(e)}",
												"TAC Delivery File Error"
											)
								elif not create_integration_doc:
									frappe.log_error(
										f"TAC integration skipped for order {self.name}: create_integration_file is not enabled for status '{self.status}'",
										"TAC Integration Debug"
									)
								elif not tac_delivery_outgoing:
									frappe.log_error(
										f"TAC integration skipped for order {self.name}: tac_delivery_outgoing function not available (import failed)",
										"TAC Integration Debug"
									)

							order_doc = frappe.get_doc("Vehicle Order", self.order_no)

							row_id = int(self.row_id)

							for item in order_doc.vehicles_basket:
								if item.idx == row_id:
									item.status = self.status

									if self.vinserial_no:
										item.vin_serial_no = self.vinserial_no

									if self.price_excl:
										item.price_excl = self.price_excl

							order_doc.save(ignore_permissions=True)
							frappe.db.commit()

		else:
			apply_fifo_on_orders = frappe.db.get_value(
				"Vehicles Order Purpose", {"name": self.purpose}, "apply_fifo_on_orders"
			)

			if apply_fifo_on_orders:
				if not self.vinserial_no:
					automatically_apply_fifo = frappe.db.get_value(
						"Vehicles Order Status",
						{"name": self.status},
						"automatically_apply_fifo_rule_on_vehicles_orders",
					)

					if automatically_apply_fifo:
						fifo_from_date = frappe.db.get_value(
							"Vehicles Order Purpose", {"name": self.purpose}, "allocate_from_date"
						)
						fifo_to_date = frappe.db.get_value(
							"Vehicles Order Purpose", {"name": self.purpose}, "allocate_to_date"
						)

						if (
							not (fifo_from_date and fifo_to_date and fifo_from_date > 0 and fifo_to_date > 0)
						) or (fifo_from_date <= today_day <= fifo_to_date):
							result = frappe.db.sql(
								"""
								SELECT
									es.name,
									es.vin_serial_no,
									es.model,
									es.colour,
									es.description,
									es.engine_no,
									se.posting_date
								FROM
									`tabVehicle Stock` es
								LEFT JOIN
									`tabStock Entry Detail` sed ON sed.serial_no = es.vin_serial_no
								LEFT JOIN
									`tabStock Entry` se ON se.name = sed.parent
								WHERE
									se.stock_entry_type = 'Material Receipt'
									AND es.model = %(model)s
							        AND es.colour = %(colour)s
									AND es.availability_status = %(availability_status)s
									AND es.dealer = %(dealer)s
									AND NOT EXISTS (
										SELECT 1
										FROM `tabHead Office Vehicle Orders` ho
										WHERE ho.vinserial_no = es.vin_serial_no
									)
									AND se.name IN (
										SELECT MIN(se2.name)
										FROM `tabStock Entry` se2
										LEFT JOIN `tabStock Entry Detail` sed2 ON sed2.parent = se2.name
										WHERE se2.stock_entry_type = 'Material Receipt'
										AND sed2.serial_no = es.vin_serial_no
										GROUP BY sed2.serial_no
									)
								ORDER BY
									se.posting_date ASC,
									se.posting_time ASC
								LIMIT 1
							""",
								{
									"model": self.model,
									"colour": colour,
									"availability_status": "Available",
									"dealer": self.order_placed_to,
								},
							)

							if result and len(result) > 0:
								vin_number = result[0][1]
								model = result[0][2]
								colour = result[0][3]
								description = result[0][4]
								engine_no = result[0][5]

								formatted_colour = colour.split(" - ")[0]

								if vin_number:
									self.vinserial_no = vin_number
									self.model_delivered = model
									self.model_description = description
									self.colour_delivered = formatted_colour
									self.engine_no = engine_no
									self.status = "Processed"

									self.allocate_vinno()

									user_company = frappe.defaults.get_user_default("Company")
									head_office = frappe.get_value(
										"Company", {"custom_head_office": 1}, "name"
									)
									if user_company == head_office:
										create_integration_doc = frappe.db.get_value(
											"Vehicles Order Status",
											{"name": self.status},
											"create_integration_file",
										)
										if create_integration_doc and tac_delivery_outgoing:
											if self.vinserial_no:
												try:
													tac_delivery_outgoing(
														self.vinserial_no,
														self.model_delivered,
														self.model_description,
														self.colour_delivered,
														self.order_placed_by,
													)
												except Exception as e:
													frappe.log_error(
														f"Failed to create TAC delivery file for order {self.name}, VIN {self.vinserial_no}: {str(e)}",
														"TAC Delivery File Error"
													)
										elif not create_integration_doc:
											frappe.log_error(
												f"TAC integration skipped for order {self.name}: create_integration_file is not enabled for status '{self.status}'",
												"TAC Integration Debug"
											)
										elif not tac_delivery_outgoing:
											frappe.log_error(
												f"TAC integration skipped for order {self.name}: tac_delivery_outgoing function not available (import failed)",
												"TAC Integration Debug"
											)

									order_doc = frappe.get_doc("Vehicle Order", self.order_no)

									row_id = int(self.row_id)

									for item in order_doc.vehicles_basket:
										if item.idx == row_id:
											item.status = self.status

											if self.vinserial_no:
												item.vin_serial_no = self.vinserial_no

											if self.price_excl:
												item.price_excl = self.price_excl

									order_doc.save(ignore_permissions=True)
									frappe.db.commit()

	@frappe.whitelist()
	def allocate_vinno(self, front_end_call=None):
		stock_doc = frappe.get_doc("Vehicle Stock", self.vinserial_no)

		if stock_doc:
			stock_doc.availability_status = "Reserved"
			stock_doc.hq_order_no = self.name
			stock_doc.original_purchasing_dealer = self.order_placed_by

			comment = f"Vehicle has been allocated to Head Office order: {self.name}"

			stock_doc.add_comment("Comment", comment)

			stock_doc.save(ignore_permissions=True)

			now = now_datetime()

			hours = (
				frappe.db.get_single_value("Vehicle Stock Settings", "maximum_reservation_time_hours") or 0
			)

			reserve_to = now + timedelta(hours=hours)

			reserve_doc = frappe.new_doc("Reserved Vehicles")

			reserve_doc.vin_serial_no = self.vinserial_no
			reserve_doc.dealer = self.order_placed_by
			reserve_doc.model = self.model
			reserve_doc.status = "Reserved"
			reserve_doc.reserve_reason = "Order Pending"
			reserve_doc.reserve_from_date = now
			reserve_doc.reserve_to_date = reserve_to

			reserve_doc.insert(ignore_permissions=True)

			self.remove_tags()

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = self.vinserial_no
			new_tracking_doc.action_summary = "Vehicle Allocated to Order"
			new_tracking_doc.request_datetime = tracking_date_time
			new_tracking_doc.type = "EDP Online"
			new_tracking_doc.status = "Successful"

			new_tracking_doc.request = f"VIN/Serial No {self.vinserial_no} allocated on Order {self.name} to Dealer {self.order_placed_by}"

			new_tracking_doc.insert(ignore_permissions=True)

			if not front_end_call:
				self.save()

			frappe.db.commit()

			return f"VIN/Serial No {self.vinserial_no} has successfully been allocated to order {self.name}"

	@frappe.whitelist()
	def remove_allocated_vinno(self, previous_vinno_value, comment=None):
		if comment:
			self.add_comment("Comment", comment)
			status = frappe.db.get_single_value("Vehicle Stock Settings", "change_order_status_to")

			self.status = status if status else "Pending"
		else:
			self.status = "Pending"

		stock_doc = frappe.get_doc("Vehicle Stock", previous_vinno_value)

		if stock_doc:
			reserve_docs = frappe.db.get_all(
				"Reserved Vehicles",
				filters={"vin_serial_no": self.vinserial_no, "status": "Reserved"},
				pluck="name",
			)

			for docname in reserve_docs:
				reserve_doc = frappe.get_doc("Reserved Vehicles", docname)

				if reserve_doc:
					if reserve_doc.status == "Reserved":
						reserve_doc.status = "Available"
						reserve_doc.save(ignore_permissions=True)
						reserve_doc.submit()

			stock_doc.availability_status = "Available"
			stock_doc.hq_order_no = None
			stock_doc.original_purchasing_dealer = ""
			stock_doc.ho_invoice_no = ""
			stock_doc.ho_invoice_amt = ""
			stock_doc.ho_invoice_date = ""

			comment = f"Vehicle allocation has been removed from Head Office order: {self.name}"

			stock_doc.add_comment("Comment", comment)

			hq_order_docs = frappe.db.get_all(
				"Head Office Vehicle Orders",
				filters={"model": self.model, "colour": self.colour, "vinserial_no": ""},
				fields=["name"],
			)

			for doc in hq_order_docs:
				hq_doc = frappe.get_doc("Head Office Vehicle Orders", doc.name)

				# Fetch existing tags
				existing_tags = hq_doc.get_tags()

				# Add the 'Stock Available' tag if it doesn't already exist
				if "Stock Available" not in existing_tags:
					hq_doc.add_tag("Stock Available")

			stock_doc.save(ignore_permissions=True)

			now = datetime.now()

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = previous_vinno_value
			new_tracking_doc.action_summary = f"Vehicle un-allocated from order {self.name}"
			new_tracking_doc.request_datetime = tracking_date_time
			new_tracking_doc.type = "EDP Online"
			new_tracking_doc.status = "Successful"

			new_tracking_doc.request = (
				f"VIN/Serial No {self.vinserial_no} has been removed from Order {self.name} by System"
			)

			new_tracking_doc.insert(ignore_permissions=True)

			self.save(ignore_permissions=True)

			frappe.db.commit()

			return (
				f"VIN/Serial No {previous_vinno_value} has successfully been removed from order {self.name}"
			)

	@frappe.whitelist()
	def remove_tags(self):
		try:
			# Ensure the current document has the _user_tags field and check for "Stock Available"
			if not getattr(self, "_user_tags", None) or "Stock Available" not in self._user_tags:
				return

			# Fetch other documents with the "Stock Available" tag
			documents = frappe.get_all(
				"Head Office Vehicle Orders",
				filters={
					"_user_tags": ["like", "%Stock Available%"],
					"name": ["!=", self.name],
					"colour": self.colour,
					"model": self.model,
				},
				fields=["name"],
			)

			formatted_colour = self.colour + " - " + self.model

			# Count the available vehicles based on the provided filters
			available_vehicles = frappe.db.count(
				"Vehicle Stock",
				{
					"dealer": self.order_placed_to,
					"model": self.model,
					"availability_status": "Available",
					"colour": formatted_colour,
					"name": ["!=", self.vinserial_no],
				},
			)

			# Proceed with tag removal only if no available vehicles exist
			if available_vehicles == 0:
				for document in documents:
					remove_tag("Stock Available", self.doctype, document["name"])

			remove_tag("Stock Available", self.doctype, self.name)

		except Exception as e:
			frappe.log_error(frappe.get_traceback(), "Tag Removal Error")
			frappe.throw(f"An error occurred while removing the tag: {e!s}")

	def autoname(self):
		# Check if there are existing orders with the same order_no
		if frappe.db.exists("Head Office Vehicle Orders", {"order_no": self.order_no}):
			docs = frappe.get_all("Head Office Vehicle Orders", filters={"order_no": self.order_no})

			index = 1

			# Find the highest index and increment it
			if len(docs) > 0:
				index = (
					max(
						[
							int(doc.get("name").split("-")[1])
							for doc in docs
							if doc.get("name").split("-")[1].isdigit()
						],
						default=0,
					)
					+ 1
				)
		else:
			index = 1

		self.name = f"{self.order_no}-{index}"

	@frappe.whitelist()
	def post_comment(self, comment):
		if comment:
			self.add_comment("Comment", comment)
