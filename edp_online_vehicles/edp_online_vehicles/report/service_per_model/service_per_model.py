# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder import Field
from frappe.query_builder.functions import Count, Date, Sum


def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	message = get_message()

	return columns, data, message


def get_columns():
	return [
		{"label": _("Model"), "fieldname": "model", "fieldtype": "Data", "width": 120},
		{
			"label": _("Model Description"),
			"fieldname": "model_description",
			"fieldtype": "Data",
			"width": 120,
		},
		{"label": _("Total Services"), "fieldname": "total_services", "fieldtype": "Int", "width": 120},
		{
			"label": _("Total Parts Cost"),
			"fieldname": "total_parts_cost",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Total Labour Cost"),
			"fieldname": "total_labour_cost",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Total Labour Hours"),
			"fieldname": "total_labour_hours",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Total Service Cost"),
			"fieldname": "total_service_cost",
			"fieldtype": "Currency",
			"width": 120,
		},
		{
			"label": _("Average Service Cost"),
			"fieldname": "avg_service_cost",
			"fieldtype": "Currency",
			"width": 120,
		},
	]


def get_message():
	return "This report excludes cancelled services."


# def get_data(filters):

#     if not filters:
#         filters = {}

#     Service = frappe.qb.DocType("Vehicles Service")

#     conditions = []
#     if filters.get("from_date"):
#         conditions.append(Date(Field("creation")).between(filters.from_date, filters.to_date))
#     if filters.get("customer"):
#         conditions.append(Field("customer") == filters["customer"])


#     query = (
#         frappe.qb.from_(Service)
#         .select(
#             Service.model,
#             Count(Service.name).as_("total_services"),
#             Sum(Service.parts_total_excl).as_("total_parts_cost"),
#             Sum(Service.labours_total_excl).as_("total_labour_cost"),
#             Sum(Service.duration_total).as_("total_labour_hours"),
#         )
#         .where(
#                 Service.model.isnotnull()
#                 & (Service.docstatus != 2)
#                 & (Service.dealer == filters.dealer)
#             )
#     )

#     for condition in conditions:
#         query = query.where(condition)


#     query = query.groupby(Service.model)

#     services = query.run(as_dict=True)

#     for service in services:
#         total_cost = service['total_parts_cost'] + service['total_labour_cost']
#         service['total_service_cost'] = total_cost
#         service['avg_service_cost'] = total_cost / service['total_services'] if service['total_services'] else 0

#     return services


def get_data(filters):
	if not filters:
		filters = {}

	# Define the DocTypes
	Service = frappe.qb.DocType("Vehicles Service")
	ModelAdministration = frappe.qb.DocType("Model Administration")

	hq_company = frappe.get_all("Company", filters={"custom_head_office": 1}, pluck="name")

	user_company = frappe.defaults.get_user_default("Company")

	conditions = []
	if filters.get("from_date"):
		# Assumes that creation is available from the Service doctype
		conditions.append(Date(Service.creation).between(filters["from_date"], filters["to_date"]))
	if filters.get("customer"):
		conditions.append(Service.customer == filters["customer"])
	if user_company not in hq_company:
		conditions.append(Field("dealer") == user_company)

	# Construct the query with a join on the 'model' field
	query = (
		frappe.qb.from_(Service)
		.join(ModelAdministration)
		.on(Service.model == ModelAdministration.name)
		.select(
			Service.model,
			ModelAdministration.model_description,
			Count(Service.name).as_("total_services"),
			Sum(Service.parts_total_excl).as_("total_parts_cost"),
			Sum(Service.labours_total_excl).as_("total_labour_cost"),
			Sum(Service.duration_total).as_("total_labour_hours"),
		)
		.where(Service.model.isnotnull() & (Service.docstatus != 2))
	)

	# Apply additional conditions
	for condition in conditions:
		query = query.where(condition)

	# Grouping by model and model_description to ensure correctness of the aggregation
	query = query.groupby(Service.model, ModelAdministration.model_description)

	# Execute the query and get the results as dictionary
	services = query.run(as_dict=True)

	# Calculate additional fields per service
	for service in services:
		total_cost = service["total_parts_cost"] + service["total_labour_cost"]
		service["total_service_cost"] = total_cost
		service["avg_service_cost"] = (
			total_cost / service["total_services"] if service["total_services"] else 0
		)

	return services
