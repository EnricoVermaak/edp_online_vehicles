# import frappe
# from frappe.utils import getdate, nowdate
# from collections import defaultdict
# from datetime import datetime, timedelta

# @frappe.whitelist()
# def get_data(part=None):
#     today_date = nowdate()

#     # Fetch extra settings
#     hq_companies = frappe.get_all("Company", filters={"custom_head_office": 1}, fields=["name"])
#     hq_company_names = {hq["name"] for hq in hq_companies}
#     # only_show_models_in_stock = frappe.db.get_single_value('Vehicle Stock Settings', 'only_show_models_in_stock_at_hq')
#     # hide_dealer_stock = frappe.db.get_single_value('Vehicle Stock Settings', 'hide_dealer_stock_availability')
#     # hide_vehicle_amount_in_stock = frappe.db.get_single_value('Vehicle Stock Settings', 'hide_amount_of_vehicles_in_stock')
#     # hide_unconfirmed_shipments = frappe.db.get_single_value('Vehicle Stock Settings', 'hide_unconfirmed_shipments')

#     # Fetch all models and warehouses in advance (dictionary lookup)
#     parts = {
#         p["name"]: p
#         for p in frappe.get_all(
#             "Item",
#             fields=["name", "item_name"],
#             filters={"item_group": "Parts", "disabled": 0, "is_sales_item": 1}
#         )
#     }
#     warehouses = {
#         w["name"]: w
#         for w in frappe.get_all("Warehouse", fields=["name", "custom_show_on_parts_stock_availability"])
#     }

#     # Fetch available vehicles
#     part_filters = {"item_code": ["in", parts]}

#     if part:
#         part_filters["item_code"] = part

#     item_qty = frappe.get_all(
#         "Bin",
#         fields=["item_code", "warehouse", "actual_qty"],
#         filters=part_filters
#     )

#     # Group Data Initialization (grouped by model range then model)
#     grouped_data = defaultdict(lambda: defaultdict(lambda: {
#         'model_range': None,
#         'model_code': None,
#         'model': None,
#         'hq_company': 0,
#         'dealers': 0,
#         'pipeline': 0,
#         'unconfirmed_shipments': 0,
#     }))

#     # Populate grouped_data with vehicle stock rows
#     for vehicle in vehicles:
#         model_doc = models.get(vehicle["model"])
#         warehouse_doc = warehouses.get(vehicle["target_warehouse"])
#         if model_doc and warehouse_doc:
#             # Only consider models that are not discontinued, should be shown and warehouse qualifies
#             if not model_doc["mark_as_discontinued"] and model_doc["show_on_vehicles_stock_availability"] and warehouse_doc["custom_show_on_vehicles_availability"]:
#                 veh_model = vehicle["model"]
#                 veh_range = model_doc["range"] or "Uncategorized"

#                 # Initialize entry if not present
#                 entry = grouped_data[veh_range][veh_model]
#                 entry["model_range"] = veh_range
#                 entry["model_code"] = veh_model
#                 entry["model"] = vehicle["description"]

#                 # Count only if the stock is at HQ (or else count dealer stock)
#                 if vehicle["dealer"] in hq_company_names:
#                     entry["hq_company"] += 1
#                 else:
#                     if not hide_dealer_stock:  # only count dealer stock if hide_dealer_stock is not 1
#                         entry["dealers"] += 1

#     # If only_show_models_in_stock is equal to 0, then add all active models (even if they have no stock)
#     if only_show_models_in_stock == 0:
#         for model_name, model_doc in models.items():
#             if not model_doc["mark_as_discontinued"] and model_doc["show_on_vehicles_stock_availability"]:
#                 veh_range = model_doc["range"] or "Uncategorized"
#                 # If the model isn't already in grouped_data, add it with zero counts
#                 if model_name not in grouped_data[veh_range]:
#                     grouped_data[veh_range][model_name] = {
#                         'model_range': veh_range,
#                         'model_code': model_name,
#                         'model': model_doc["model_description"],
#                         'hq_company': 0,
#                         'dealers': 0,
#                         'pipeline': 0,
#                         'unconfirmed_shipments': 0,
#                     }

#     # Build filter strings and parameters for confirmed shipments query
#     model_range_filter = "AND ma.range = %s" if model_range else ""
#     model_filter = "AND vsi.model_code = %s" if model else ""
#     params = [today_date]
#     if model_range:
#         params.append(model_range)
#     if model:
#         params.append(model)

#     shipments = frappe.db.sql(f"""
#         SELECT vsi.model_code, vs.eta_warehouse, vsi.target_warehouse, ma.range
#         FROM `tabVehicles Shipment Items` vsi
#         INNER JOIN `tabVehicles Shipment` vs ON vsi.parent = vs.name
#         INNER JOIN `tabModel Administration` ma ON vsi.model_code = ma.name
#         WHERE vs.docstatus != 2
#           AND vsi.status != 'Received'
#           AND vs.eta_warehouse >= %s
#           AND vs.hide_on_stock_availability = 0
#           {model_range_filter}
#           {model_filter}
#     """, tuple(params), as_dict=True)

#     # Dictionary for monthly shipment counts per model
#     model_month_count = defaultdict(lambda: defaultdict(int))
#     for shipment in shipments:
#         model_doc = models.get(shipment["model_code"])
#         warehouse_doc = warehouses.get(shipment["target_warehouse"])
#         if model_doc and warehouse_doc:
#             if not model_doc["mark_as_discontinued"] and model_doc["show_on_vehicles_stock_availability"] and warehouse_doc["custom_show_on_vehicles_availability"]:
#                 eta_month = getdate(shipment["eta_warehouse"]).strftime("%Y-%m")
#                 model_month_count[shipment["model_code"]][eta_month] += 1

#     # Generate the next 12 months (as strings, e.g., "2025-03")
#     next_12_months = [(datetime.now() + timedelta(days=i * 30)).strftime("%Y-%m") for i in range(12)]

#     # Process unconfirmed shipments only if the setting is not enabled
#     if not hide_unconfirmed_shipments:
#         params_unconfirmed = []
#         if model_range:
#             params_unconfirmed.append(model_range)
#         if model:
#             params_unconfirmed.append(model)

#         unconfirmed_shipments = frappe.db.sql(f"""
#             SELECT vsi.model_code, vsi.model_description, COUNT(*) AS count, vsi.target_warehouse, ma.range
#             FROM `tabVehicles Shipment Items` vsi
#             INNER JOIN `tabVehicles Shipment` vs ON vsi.parent = vs.name
#             INNER JOIN `tabModel Administration` ma ON vsi.model_code = ma.name
#             WHERE vs.docstatus != 2
#               AND vsi.status != 'Received'
#               AND (vs.eta_warehouse IS NULL OR vs.eta_warehouse = '')
#               AND vs.hide_on_stock_availability = 0
#               { "AND ma.range = %s" if model_range else "" }
#               { "AND vsi.model_code = %s" if model else "" }
#             GROUP BY vsi.model_code
#         """, tuple(params_unconfirmed) if params_unconfirmed else (), as_dict=True)

#         for shipment in unconfirmed_shipments:
#             model_doc = models.get(shipment["model_code"])
#             warehouse_doc = warehouses.get(shipment["target_warehouse"])
#             if model_doc and warehouse_doc:
#                 veh_range = model_doc["range"] or "Uncategorized"
#                 veh_model = shipment["model_code"]

#                 if veh_model not in grouped_data[veh_range]:
#                     grouped_data[veh_range][veh_model] = {
#                         'model_range': veh_range,
#                         'model_code': veh_model,
#                         'model': shipment["model_description"],
#                         'hq_company': 0,
#                         'dealers': 0,
#                         'pipeline': 0,
#                         'unconfirmed_shipments': 0,
#                     }

#                 grouped_data[veh_range][veh_model]["unconfirmed_shipments"] += shipment["count"]
#     else:
#         # When hide_unconfirmed_shipments is True, ensure all unconfirmed shipment counts are zero.
#         for veh_range, models_dict in grouped_data.items():
#             for veh_model, data in models_dict.items():
#                 data["unconfirmed_shipments"] = 0

#     # Assign shipment counts to each model entry (and calculate pipeline)
#     for veh_range, models_dict in grouped_data.items():
#         for veh_model, data in models_dict.items():
#             pipeline_count = 0
#             for i, month in enumerate(next_12_months):
#                 date_key = f"date_{i + 1}"
#                 shipment_count = model_month_count[veh_model].get(month, 0)
#                 data[date_key] = shipment_count
#                 pipeline_count += shipment_count
#             data["pipeline"] = pipeline_count

#             # If hide_vehicle_amount_in_stock is enabled,
#             # then for the count fields (hq_company, dealers, pipeline), show "Yes" if > 0.
#             if hide_vehicle_amount_in_stock:
#                 for field in ["hq_company", "dealers", "pipeline", "unconfirmed_shipments"]:
#                     data[field] = "Yes" if data[field] > 0 else ""
#                 for i in range(1, 13):
#                     date_field = f"date_{i}"
#                     data[date_field] = "Yes" if data.get(date_field, 0) > 0 else ""

#     # Convert grouped_data to a list for the output
#     return [{"model_range": veh_range, "models": list(models_dict.values())} for veh_range, models_dict in grouped_data.items()]

from collections import defaultdict
from datetime import datetime, timedelta

import frappe
from frappe.utils import getdate, nowdate


@frappe.whitelist()
def get_data(part=None):
	today_date = nowdate()

	# Get all HQ companies
	hq_companies = frappe.get_all("Company", filters={"custom_head_office": 1}, fields=["name"])
	hq_company_names = {hq["name"] for hq in hq_companies}

	# Fetch all parts (items) from the Parts item group
	parts = {
		p["name"]: p
		for p in frappe.get_all(
			"Item",
			fields=["name", "item_name"],
			filters={"item_group": "Parts", "disabled": 0, "is_sales_item": 1},
		)
	}

	# Fetch all warehouses with company info
	warehouses = {w["name"]: w for w in frappe.get_all("Warehouse", fields=["name", "company"])}

	# Fetch Bin records for parts
	part_filters = {"item_code": ["in", list(parts.keys())]}
	if part:
		part_filters["item_code"] = part

	bin_data = frappe.get_all("Bin", fields=["item_code", "warehouse", "actual_qty"], filters=part_filters)

	# Grouped data initialization (grouped by part number)
	grouped_data = defaultdict(
		lambda: {
			"part_no": None,
			"part": None,
			"hq_company": 0,
			"dealers": 0,
			"pipeline": 0,
			"unconfirmed_shipments": 0,
			# Monthly shipment counts will be stored as date_1, date_2, ..., date_12
		}
	)

	# Populate grouped_data using Bin data
	for entry in bin_data:
		part_code = entry["item_code"]
		if part_code not in parts:
			continue

		part_doc = parts.get(part_code)
		data = grouped_data[part_code]
		data["part_no"] = part_code
		data["part"] = part_doc["item_name"]

		# Check warehouse to see if it belongs to an HQ company
		warehouse = warehouses.get(entry["warehouse"])
		if warehouse and warehouse.get("company") in hq_company_names:
			data["hq_company"] += entry["actual_qty"]
		else:
			data["dealers"] += entry["actual_qty"]

	# Build filters and parameters for confirmed shipments query
	shipment_filter = ""
	params = [today_date]
	if part:
		shipment_filter += "AND psi.part_no = %s"
		params.append(part)

	# Fetch shipments from Part Shipment and its child table part_shipment_items
	shipments = frappe.db.sql(
		f"""
        SELECT psi.part_no, ps.eta_warehouse, psi.target_warehouse, psi.qty
        FROM `tabPart Shipment Items` psi
        INNER JOIN `tabPart Shipment` ps ON psi.parent = ps.name
        WHERE ps.docstatus != 2
          AND psi.status != 'Received'
          AND ps.eta_warehouse >= %s
          {shipment_filter}
    """,
		tuple(params),
		as_dict=True,
	)

	# Dictionary for monthly shipment counts per part (summing up the qty)
	part_month_count = defaultdict(lambda: defaultdict(int))
	for shipment in shipments:
		part_no = shipment["part_no"]
		eta_month = getdate(shipment["eta_warehouse"]).strftime("%Y-%m")
		qty = shipment.get("qty") or 0
		part_month_count[part_no][eta_month] += qty

	# Generate the next 12 months (e.g., "2025-03")
	next_12_months = [(datetime.now() + timedelta(days=i * 30)).strftime("%Y-%m") for i in range(12)]

	# Assign monthly shipment counts and calculate the pipeline for each part
	for part_no, data in grouped_data.items():
		pipeline_total = 0
		for i, month in enumerate(next_12_months):
			count = part_month_count[part_no].get(month, 0)
			data[f"date_{i + 1}"] = count
			pipeline_total += count
		data["pipeline"] = pipeline_total

	# Fetch unconfirmed shipments (ETA not set) for parts
	unconfirmed_filter = ""
	unconfirmed_params = []
	if part:
		unconfirmed_filter = "AND psi.part_no = %s"
		unconfirmed_params.append(part)

	unconfirmed_shipments = frappe.db.sql(
		f"""
        SELECT psi.part_no, COUNT(*) as count
        FROM `tabPart Shipment Items` psi
        INNER JOIN `tabPart Shipment` ps ON psi.parent = ps.name
        WHERE ps.docstatus != 2
          AND psi.status != 'Received'
          AND (ps.eta_warehouse IS NULL OR ps.eta_warehouse = '')
          {unconfirmed_filter}
        GROUP BY psi.part_no
    """,
		tuple(unconfirmed_params),
		as_dict=True,
	)

	# Update grouped_data with unconfirmed shipment counts
	for shipment in unconfirmed_shipments:
		part_no = shipment["part_no"]
		if part_no in grouped_data:
			grouped_data[part_no]["unconfirmed_shipments"] = shipment["count"]

	# Return the grouped data as a list
	return list(grouped_data.values())
