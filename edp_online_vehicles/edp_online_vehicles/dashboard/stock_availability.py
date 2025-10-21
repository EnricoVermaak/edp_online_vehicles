from collections import defaultdict
from datetime import datetime, timedelta

import frappe
from frappe.utils import getdate, nowdate


@frappe.whitelist()
def get_data(model_range=None, model=None):
	today_date = nowdate()

	# Fetch extra settings
	hq_companies = frappe.get_all("Company", filters={"custom_head_office": 1}, fields=["name"])
	hq_company_names = {hq["name"] for hq in hq_companies}

	user_company = frappe.defaults.get_user_default("Company")

	if user_company not in hq_company_names:
		only_show_models_in_stock = int(
			frappe.db.get_single_value("Vehicle Stock Settings", "only_show_models_in_stock_at_hq") or 0
		)
		hide_dealer_stock = int(
			frappe.db.get_single_value("Vehicle Stock Settings", "hide_dealer_stock_availability") or 0
		)
		hide_vehicle_amount_in_stock = int(
			frappe.db.get_single_value("Vehicle Stock Settings", "hide_amount_of_vehicles_in_stock") or 0
		)
		hide_unconfirmed_shipments = int(
			frappe.db.get_single_value("Vehicle Stock Settings", "hide_unconfirmed_shipments") or 0
		)
	else:
		only_show_models_in_stock = 0
		hide_dealer_stock = 0
		hide_vehicle_amount_in_stock = 0
		hide_unconfirmed_shipments = 0

	# Fetch models and warehouses
	models = {
		m["name"]: m
		for m in frappe.get_all(
			"Model Administration",
			fields=[
				"name",
				"model_description",
				"range",
				"mark_as_discontinued",
				"show_on_vehicles_stock_availability",
			],
		)
	}
	warehouses = {
		w["name"]: w
		for w in frappe.get_all("Warehouse", fields=["name", "custom_show_on_vehicles_availability"])
	}

	# Fetch all available vehicles (do not filter by range yet)
	vehicle_filters = {"availability_status": "Available"}
	if model:
		vehicle_filters["model"] = model

	vehicles = frappe.get_all(
		"Vehicle Stock",
		fields=["model", "description", "dealer", "target_warehouse"],
		filters=vehicle_filters,
	)

	# Initialize grouped data
	grouped_data = defaultdict(
		lambda: defaultdict(
			lambda: {
				"model_range": None,
				"model_code": None,
				"model": None,
				"hq_company": 0,
				"dealers": 0,
				"pipeline": 0,
				"unconfirmed_shipments": 0,
			}
		)
	)

	# Populate stock counts
	for vehicle in vehicles:
		model_doc = models.get(vehicle["model"])
		warehouse_doc = warehouses.get(vehicle["target_warehouse"])
		if not (model_doc and warehouse_doc):
			continue
		if model_doc["mark_as_discontinued"] or not model_doc["show_on_vehicles_stock_availability"]:
			continue
		if not warehouse_doc["custom_show_on_vehicles_availability"]:
			continue

		veh_code = vehicle["model"]
		veh_range = model_doc["range"] or "Uncategorized"
		entry = grouped_data[veh_range][veh_code]
		entry["model_range"] = veh_range
		entry["model_code"] = veh_code
		entry["model"] = vehicle["description"]

		if vehicle["dealer"] in hq_company_names:
			entry["hq_company"] += 1
		elif not hide_dealer_stock:
			entry["dealers"] += 1

	# Shipments logic
	# Confirmed future shipments
	model_range_filter = "AND ma.range = %s" if model_range else ""
	model_filter = "AND vsi.model_code = %s" if model else ""
	params = [today_date]
	if model_range:
		params.append(model_range)
	if model:
		params.append(model)

	shipments = frappe.db.sql(
		f"""
        SELECT vsi.model_code, vsi.target_warehouse, ma.range, vs.eta_warehouse
        FROM `tabVehicles Shipment Items` vsi
        JOIN `tabVehicles Shipment` vs ON vsi.parent = vs.name
        JOIN `tabModel Administration` ma ON vsi.model_code = ma.name
        WHERE vs.docstatus != 2
          AND vsi.status != 'Received'
          AND vs.eta_warehouse >= %s
          AND vs.hide_on_stock_availability = 0
          {model_range_filter}
          {model_filter}
    """,
		tuple(params),
		as_dict=True,
	)

	# Count per month
	month_counts = defaultdict(lambda: defaultdict(int))
	for s in shipments:
		mdoc = models.get(s["model_code"])
		wdoc = warehouses.get(s["target_warehouse"])
		if not (mdoc and wdoc):
			continue
		if mdoc["mark_as_discontinued"] or not mdoc["show_on_vehicles_stock_availability"]:
			continue
		if not wdoc["custom_show_on_vehicles_availability"]:
			continue
		month = getdate(s["eta_warehouse"]).strftime("%Y-%m")
		month_counts[s["model_code"]][month] += 1

	next_12_months = [(datetime.now() + timedelta(days=i * 30)).strftime("%Y-%m") for i in range(12)]

	# Unconfirmed shipments
	unconfirmed = []
	if not hide_unconfirmed_shipments:
		qc = []
		if model_range:
			qc.append(model_range)
		if model:
			qc.append(model)
		sql = f"""
            SELECT vsi.model_code, vsi.model_description, COUNT(*) AS cnt, vsi.target_warehouse, ma.range
            FROM `tabVehicles Shipment Items` vsi
            JOIN `tabVehicles Shipment` vs ON vsi.parent = vs.name
            JOIN `tabModel Administration` ma ON vsi.model_code = ma.name
            WHERE vs.docstatus != 2
              AND vsi.status != 'Received'
              AND (vs.eta_warehouse IS NULL OR vs.eta_warehouse = '')
              AND vs.hide_on_stock_availability = 0
              {"AND ma.range = %s" if model_range else ""}
              {"AND vsi.model_code = %s" if model else ""}
            GROUP BY vsi.model_code, vsi.target_warehouse
        """
		unconfirmed = frappe.db.sql(sql, tuple(qc) if qc else (), as_dict=True)

	# Assign pipeline & unconfirmed, respecting only_show_models_in_stock
	for rng, models_dict in list(grouped_data.items()):
		for code, data in list(models_dict.items()):
			# Pipeline
			total_pipeline = 0
			for idx, mth in enumerate(next_12_months, start=1):
				count = month_counts[code].get(mth, 0)
				data[f"date_{idx}"] = count
				total_pipeline += count
			data["pipeline"] = total_pipeline

			# Unconfirmed
			if not hide_unconfirmed_shipments:
				for u in unconfirmed:
					if u["model_code"] == code:
						if code not in grouped_data[rng] and only_show_models_in_stock:
							# skip models without stock
							continue
						data["unconfirmed_shipments"] += u["cnt"]

			# Hide counts if needed
			if hide_vehicle_amount_in_stock:
				for fld in ["hq_company", "dealers", "pipeline", "unconfirmed_shipments"]:
					data[fld] = "Yes" if data[fld] > 0 else ""
				for i in range(1, 13):
					data[f"date_{i}"] = "Yes" if data.get(f"date_{i}", 0) > 0 else ""

	# Final cleanup when only_show_models_in_stock == 1
	# if only_show_models_in_stock:
	#     for rng in list(grouped_data.keys()):
	#         for code, data in list(grouped_data[rng].items()):
	#             has_stock = any(
	#                 isinstance(data[k], int) and data[k] > 0
	#                 for k in ['hq_company', 'dealers']
	#             )
	#             if not has_stock:
	#                 del grouped_data[rng][code]
	#         if not grouped_data[rng]:
	#             del grouped_data[rng]

	if only_show_models_in_stock:
		for rng in list(grouped_data.keys()):
			for code, data in list(grouped_data[rng].items()):
				# keep it if HQ has at least one
				if data.get("hq_company", 0) == 0:
					# no HQ stock → remove
					del grouped_data[rng][code]
			# if that range now has nothing, drop the range
			if not grouped_data[rng]:
				del grouped_data[rng]

	# Filter grouped data by range after grouping
	if model_range:
		grouped_data = {rng: md for rng, md in grouped_data.items() if rng == model_range}

	# Return as list
	return [{"model_range": rng, "models": list(md.values())} for rng, md in grouped_data.items()]
