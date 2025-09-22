from datetime import datetime

import frappe
from dateutil.relativedelta import relativedelta


@frappe.whitelist()
def get_hq_data(model=None):
	# Construct the base SQL query
	query = """
        SELECT
            vs.model,
            vs.vin_serial_no,
            vs.dealer,
            vs.colour,
            vs.description,
            ma.range
        FROM
            `tabVehicle Stock` AS vs
        JOIN
            `tabCompany` AS c ON vs.dealer = c.name
        LEFT JOIN
            `tabModel Administration` AS ma ON vs.model = ma.name
        WHERE
            c.custom_head_office = 1
            AND vs.availability_status = 'Available'
    """

	# Add model filter if provided
	if model:
		query += " AND vs.model = %s"
		data = frappe.db.sql(query, (model,), as_dict=True)
	else:
		data = frappe.db.sql(query, as_dict=True)

	# Process the results
	result = []
	for row in data:
		colour = row.get("colour", "")

		formatted_colour = colour.split(" - ")[0]

		vehicle_data = {
			"Range": row.get("range", ""),
			"Model": row.get("model", ""),
			"Description": row.get("description", ""),
			"Vin/Serial No": row.get("vin_serial_no", ""),
			"Dealer": row.get("dealer", ""),
			"Colour": formatted_colour,
		}
		result.append(vehicle_data)

	return result


@frappe.whitelist()
def get_dealer_data(model=None):
	# Construct the base SQL query
	query = """
        SELECT
            vs.model,
            vs.vin_serial_no,
            vs.stock_no,
            vs.dealer,
            vs.colour,
            vs.description,
            ma.range
        FROM
            `tabVehicle Stock` AS vs
        JOIN
            `tabCompany` AS c ON vs.dealer = c.name
        LEFT JOIN
            `tabModel Administration` AS ma ON vs.model = ma.name
        WHERE
            c.custom_head_office = 0
            AND vs.availability_status = 'Available'
    """

	# Add model filter if provided
	if model:
		query += " AND vs.model = %s"
		data = frappe.db.sql(query, (model,), as_dict=True)
	else:
		data = frappe.db.sql(query, as_dict=True)

	# Process the results
	result = []
	for row in data:
		colour = row.get("colour", "")

		formatted_colour = colour.split(" - ")[0]

		vehicle_data = {
			"Range": row.get("range", ""),
			"Model": row.get("model", ""),
			"Description": row.get("description", ""),
			"Vin/Serial No": row.get("vin_serial_no", ""),
			"Dealer": row.get("dealer", ""),
			"Colour": formatted_colour,
		}
		result.append(vehicle_data)

	return result


@frappe.whitelist()
def get_pipline_data(model=None, date=None):
	# Define the mapping of date parameters to month offsets
	date_mapping = {
		"Date 1": 0,
		"Date 2": 1,
		"Date 3": 2,
		"Date 4": 3,
		"Date 5": 4,
		"Date 6": 5,
		"Date 7": 6,
		"Date 8": 7,
		"Date 9": 8,
		"Date 10": 9,
		"Date 11": 10,
		"Date 12": 11,
	}

	# Initialize filters
	filters = [
		"vs.docstatus != 2",
		"vsi.status != 'Received'",
		"vs.hide_on_stock_availability = 0",
		"(vs.eta_warehouse IS NOT NULL AND vs.eta_warehouse != '')",
	]

	# Calculate the target month and year based on the date parameter
	if date in date_mapping:
		target_date = datetime.today() + relativedelta(months=date_mapping[date])
		target_year = target_date.year
		target_month = target_date.month
		filters.append(f"YEAR(vs.eta_warehouse) = {target_year}")
		filters.append(f"MONTH(vs.eta_warehouse) = {target_month}")

	# Add model filter if provided
	if model:
		filters.append(f"vsi.model_code = '{model}'")

	# Construct the SQL query with filters
	query = """
        SELECT
            vsi.model_code,
            vsi.model_description,
            vsi.colour,
            vs.eta_warehouse,
            vsi.stock_no,
            vsi.vin_serial_no,
            ma.range
        FROM
            `tabVehicles Shipment Items` vsi
        INNER JOIN
            `tabVehicles Shipment` vs ON vsi.parent = vs.name
        INNER JOIN
            `tabModel Administration` ma ON vsi.model_code = ma.name
        WHERE
            {conditions}
    """.format(conditions=" AND ".join(filters))

	# Execute the query
	data = frappe.db.sql(query, as_dict=True)

	# Process the results
	result = []
	for row in data:
		colour = row.get("colour", "")

		formatted_colour = colour.split(" - ")[0]

		vehicle_data = {
			"Range": row.get("range", ""),
			"Model": row.get("model_code", ""),
			"Stock No": row.get("stock_no", ""),
			"Vin/Serial No": row.get("vin_serial_no", ""),
			"ETA Date": row.get("eta_warehouse", "").strftime("%Y-%m-%d") if row.get("eta_warehouse") else "",
			"Description": row.get("model_description", ""),
			"Colour": formatted_colour,
		}
		result.append(vehicle_data)

	return result


@frappe.whitelist()
def get_total_data(model=None):
	total_data = []

	# Get vehicles that are in stock from both head office and dealer companies
	hq_data = get_hq_data(model)
	dealer_data = get_dealer_data(model)
	total_data.extend(hq_data)
	total_data.extend(dealer_data)

	# Get vehicles from shipments (pipeline) and unconfirmed shipments
	pipline_data = get_pipline_data(model)
	unconfirmed_data = get_unconfirmed_data(model)

	for row in pipline_data:
		vehicle_data = {
			"Range": row.get("Range", ""),
			"Model": row.get("Model", ""),
			"Description": row.get("Description", ""),
			"Vin/Serial No": row.get("Vin/Serial No", ""),
			"Dealer": "Mahindra SA",
			"Colour": row.get("Colour", ""),
		}
		total_data.append(vehicle_data)

	for row in unconfirmed_data:
		vehicle_data = {
			"Range": row.get("Range", ""),
			"Model": row.get("Model", ""),
			"Description": row.get("Description", ""),
			"Vin/Serial No": row.get("Vin/Serial No", ""),
			"Dealer": "Mahindra SA",
			"Colour": row.get("Colour", ""),
		}
		total_data.append(vehicle_data)

	return total_data


@frappe.whitelist()
def get_unconfirmed_data(model=None):
	# Initialize filters for shipments that do NOT have an ETA date
	filters = [
		"vs.docstatus != 2",
		"vsi.status != 'Received'",
		"vs.hide_on_stock_availability = 0",
		"(vs.eta_warehouse IS NULL OR vs.eta_warehouse = '')",
	]

	# Add model filter if provided
	if model:
		filters.append(f"vsi.model_code = '{model}'")

	# Construct the SQL query with filters
	query = """
        SELECT
            vsi.model_code,
            vsi.model_description,
            vsi.colour,
            vs.eta_warehouse,
            vsi.stock_no,
            vsi.vin_serial_no,
            ma.range
        FROM
            `tabVehicles Shipment Items` vsi
        INNER JOIN
            `tabVehicles Shipment` vs ON vsi.parent = vs.name
        INNER JOIN
            `tabModel Administration` ma ON vsi.model_code = ma.name
        WHERE
            {conditions}
    """.format(conditions=" AND ".join(filters))

	# Execute the query
	data = frappe.db.sql(query, as_dict=True)

	# Process the results
	result = []
	for row in data:
		colour = row.get("colour", "")

		formatted_colour = colour.split(" - ")[0]

		vehicle_data = {
			"Range": row.get("range", ""),
			"Model": row.get("model_code", ""),
			"Stock No": row.get("stock_no", ""),
			"Vin/Serial No": row.get("vin_serial_no", ""),
			"ETA Date": row.get("eta_warehouse", "").strftime("%Y-%m-%d") if row.get("eta_warehouse") else "",
			"Description": row.get("model_description", ""),
			"Colour": formatted_colour,
		}
		result.append(vehicle_data)

	return result
