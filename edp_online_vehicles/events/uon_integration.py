import csv
import os
from datetime import datetime, timedelta

import frappe
import paramiko


@frappe.whitelist()
def uon_sftp():
	hostname = "edpsecure.co.za"
	port = 22
	username = "uonuser"
	password = "U0nUs3r2025"

	uon_incoming_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_incoming"
	uon_outgoing_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_outgoing"

	remote_incoming_folder = "/Incoming"
	remote_outgoing_folder = "/Outgoing"

	transport = paramiko.Transport((hostname, port))
	transport.connect(username=username, password=password)
	sftp = paramiko.SFTPClient.from_transport(transport)

	sftp.chdir(remote_incoming_folder)
	remote_files = sftp.listdir()

	os.makedirs(uon_incoming_folder, exist_ok=True)

	for filename in remote_files:
		if filename.lower().endswith(".csv"):
			local_path = os.path.join(uon_incoming_folder, filename)
			sftp.get(filename, local_path)
			sftp.remove(filename)

	sftp.chdir(remote_outgoing_folder)

	for filename in os.listdir(uon_outgoing_folder):
		if filename.lower().endswith(".csv"):
			local_path = os.path.join(uon_outgoing_folder, filename)
			if os.path.isfile(local_path):
				sftp.put(local_path, filename)

				if os.path.isfile(local_path):
					os.remove(local_path)

	sftp.close()
	transport.close()


@frappe.whitelist()
def outgoing_vehicles_in_transit():
	# --- Setup output file ---
	now = datetime.now()
	yesterday = now - timedelta(days=1)
	fname = f"P-{now.strftime('%Y%m%d%H%M%S')}-{yesterday.strftime('%Y%m%d')}_NewVehiclesinTransit.csv"
	folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_outgoing"
	os.makedirs(folder, exist_ok=True)
	path = os.path.join(folder, fname)

	# --- CSV header ---
	rows = [
		[
			"DealerCode",
			"DealerName",
			"RSM",
			"Category",
			"Territory",
			"ProductLine",
			"ModelDesc",
			"VINNumber",
			"EngineNo",
			"Colour",
			"DaysInTransit",
			"Tracking",
			"OrderNo",
			"SHIPNo",
			"Warehouse",
		]
	]

	# 1) Get all VINs in “Goods In Transit” warehouses
	serials = frappe.get_all(
		"Serial No", filters={"warehouse": ["like", "%Goods In Transit%"]}, fields=["name"]
	)

	for s in serials:
		vin = s.name

		# 2) Raw SQL: find the single latest Stock Entry + child row for this VIN
		sql = """
            SELECT
              se.name AS entry_name,
              se.custom_dealer,
              se.posting_date,
              se.creation,
              sei.t_warehouse,
              sei.serial_no
            FROM `tabStock Entry Detail` sei
            JOIN `tabStock Entry` se
              ON sei.parent = se.name
            WHERE
              se.stock_entry_type = 'Material Transfer'
              AND sei.serial_no = %s
            ORDER BY
              se.posting_date DESC,
              se.creation DESC
            LIMIT 1
        """
		result = frappe.db.sql(sql, (vin,), as_dict=True)
		if not result:
			continue

		latest = result[0]
		t_wh = latest.t_warehouse or ""

		# 3) Make sure the *destination* warehouse still contains “Goods In Transit”
		if "Goods In Transit" not in t_wh:
			continue

		# 4) Fetch the docs you need
		try:
			frappe.get_doc("Serial No", vin)
			stock_doc = frappe.get_doc("Vehicle Stock", vin)
			order_doc = frappe.get_last_doc("Head Office Vehicle Orders", filters={"vinserial_no": vin})
		except frappe.DoesNotExistError:
			continue

		# Calculate days in transit
		post_dt = datetime.combine(latest.posting_date, datetime.min.time())
		days = (now - post_dt).days

		# Dealer split
		dealer_raw = latest.custom_dealer or ""
		if " - " in dealer_raw:
			d_name, d_code = dealer_raw.split(" - ", 1)
		else:
			d_name = dealer_raw
			d_code = ""

		# Shipment lookup
		ship = frappe.db.sql(
			"""
            SELECT parent.shipment_file_no
            FROM `tabVehicles Shipment` parent
            JOIN `tabVehicles Shipment Items` child
              ON child.parent = parent.name
            WHERE child.vin_serial_no = %s
            LIMIT 1
        """,
			vin,
			as_dict=True,
		)
		ship_no = ship[0].shipment_file_no if ship else ""

		# Build row
		rows.append(
			[
				d_code.strip(),
				d_name.strip(),
				"",
				stock_doc.catagory or "",
				stock_doc.current_location or "",
				"",
				stock_doc.description or "",
				vin,
				stock_doc.engine_no or "",
				(stock_doc.colour or "").split(" - ")[0],
				days,
				"",
				getattr(order_doc, "dealer_order_no", ""),
				ship_no,
				t_wh,
			]
		)

	# 5) Write CSV
	with open(path, "w", newline="") as fp:
		writer = csv.writer(fp)
		writer.writerows(rows)

	return {"file": path}


@frappe.whitelist()
def outgoing_vehicles_stock():
	# Define the output directory
	uon_outgoing_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_outgoing"

	row_nr = 1

	# Get the current datetime
	now = datetime.now()
	yesterday_date = now - timedelta(days=1)

	# Format datetime as yyyyMMddHHmmss
	formatted_datetime = now.strftime("%Y%m%d%H%M%S")
	formatted_yesterday = yesterday_date.strftime("%Y%m%d")

	# Construct the filename
	filename = f"P-{formatted_datetime}-{formatted_yesterday}_HeadOfficeVehiclesStock.csv"

	# Ensure the directory exists
	os.makedirs(uon_outgoing_folder, exist_ok=True)

	# Full file path
	file_path = os.path.join(uon_outgoing_folder, filename)

	# Header for the CSV file
	data = [
		[
			"Nr",
			"ItemCode",
			"ProductLine",
			"ModelDescription",
			"VIN",
			"EngineNo",
			"Colour",
			"InDate",
			"DaysInMSAStock",
			"WarehouseCode",
			"WarehouseName",
			"ShipmentNr",
			"OrderNo",
			"Blocked",
			"BlockedComments",
			"ProductCode",
		]
	]

	# Get the head office company
	head_office_company = frappe.get_value("Company", {"custom_head_office": 1}, "name")
	if not head_office_company:
		frappe.throw("No head office company found with custom_head_office = 1.")

	# Fetch Vehicle Stock records where the dealer is the head office company
	vehicles = frappe.get_all(
		"Vehicle Stock",
		filters={"dealer": head_office_company, "availability_status": "Available"},
		fields=[
			"name",
			"model",
			"description",
			"engine_no",
			"colour",
			"target_warehouse",
			"current_location",
		],
	)

	for vehicle in vehicles:
		mr = frappe.db.sql(
			"""
            SELECT
                parent.name,
                parent.posting_date,
                parent.posting_time
            FROM
                `tabStock Entry` AS parent
            JOIN
                `tabStock Entry Detail` AS child
            ON
                child.parent = parent.name
            WHERE
                parent.stock_entry_type = 'Material Receipt'
                AND parent.company = %s
                AND child.serial_no = %s
            ORDER BY
                parent.posting_date DESC, parent.posting_time DESC
            LIMIT 1
        """,
			(head_office_company, vehicle["name"]),
			as_dict=True,
		)

		if not mr:
			# If no material receipt found, skip this vehicle.
			continue

		mr_doc = mr[0]

		try:
			posting_datetime = datetime.strptime(
				f"{mr_doc.posting_date} {mr_doc.posting_time}", "%Y-%m-%d %H:%M:%S"
			)
		except Exception:
			# Fallback: combine posting_date with midnight.
			posting_datetime = datetime.combine(mr_doc.posting_date, datetime.min.time())

		# Calculate the number of days in head office stock
		days_in_stock = (now - posting_datetime).days
		in_date = posting_datetime.strftime("%Y/%m/%d %H:%M:%S")

		# Search for the Vehicles Shipment document containing the serial_no
		shipment = frappe.db.sql(
			"""
                SELECT
                    parent.name,
                    parent.shipment_file_no
                FROM
                    `tabVehicles Shipment` AS parent
                JOIN
                    `tabVehicles Shipment Items` AS child
                ON
                    child.parent = parent.name
                WHERE
                    child.vin_serial_no = %s
            """,
			(vehicle["name"],),
			as_dict=True,
		)

		if shipment:
			ship_no = shipment[0].shipment_file_no

		data.append(
			[
				row_nr,  # Nr
				vehicle["model"] or "",  # ItemCode
				"",  # ProductLine
				vehicle["description"] or "",  # ModelDescription
				vehicle["name"] or "",  # VIN
				vehicle["engine_no"] or "",  # EngineNo
				(vehicle["colour"].split(" - ")[0] if vehicle["colour"] else ""),  # Colour
				in_date,  # InDate (from material receipt)
				days_in_stock,  # DaysInMSAStock
				"",  # WarehouseCode
				vehicle["target_warehouse"] or "",  # WarehouseName
				ship_no or "",  # ShipmentNr
				"",  # OrderNo
				"",  # Blocked
				"",  # BlockedComments
				"",  # ProductCode
			]
		)
		row_nr += 1

	# Write data to the CSV file
	with open(file_path, mode="w", newline="") as file:
		writer = csv.writer(file)
		writer.writerows(data)


@frappe.whitelist()
def outgoing_dealer_stock():
	# Define the output directory
	uon_outgoing_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_outgoing"

	# Get the current datetime
	now = datetime.now()
	yesterday_date = now - timedelta(days=1)

	# Format datetime as yyyyMMddHHmmss
	formatted_datetime = now.strftime("%Y%m%d%H%M%S")
	formatted_yesterday = yesterday_date.strftime("%Y%m%d")

	# Construct the filename
	filename = f"P-{formatted_datetime}-{formatted_yesterday}_DealerNewVehicleStock.csv"

	# Ensure the directory exists
	os.makedirs(uon_outgoing_folder, exist_ok=True)

	# Full file path
	file_path = os.path.join(uon_outgoing_folder, filename)

	# Header for the CSV file
	data = [
		[
			"DealerCode",
			"DealerName",
			"RSM",
			"Category",
			"Territory",
			"ProductLine",
			"ModelDescription",
			"VINNumber",
			"EngineNo",
			"Colour",
			"InTransit",
			"DaysInStock",
			"InvoiceDate",
		]
	]

	# Get the head office company
	head_office_company = frappe.get_value("Company", {"custom_head_office": 1}, "name")
	if not head_office_company:
		frappe.throw("No head office company found with custom_head_office = 1.")

	# Fetch Vehicle Stock records where the dealer is the head office company
	vehicles = frappe.get_all(
		"Vehicle Stock",
		filters={"dealer": ["!=", head_office_company], "availability_status": "Available"},
		fields=[
			"name",
			"model",
			"description",
			"engine_no",
			"colour",
			"current_location",
			"catagory",
			"ho_invoice_date",
			"dealer",
		],
	)

	for vehicle in vehicles:
		dealer_abbr = frappe.get_value("Company", vehicle["dealer"], "abbr")

		transit_warehouse = "Goods In Transit - " + dealer_abbr

		in_transit = ""

		if frappe.db.exists("Serial No", {"name": vehicle["name"], "warehouse": transit_warehouse}):
			in_transit = "Y"
		else:
			in_transit = "N"

		mr = frappe.db.sql(
			"""
            SELECT
                parent.name,
                parent.posting_date,
                parent.posting_time
            FROM
                `tabStock Entry` AS parent
            JOIN
                `tabStock Entry Detail` AS child
            ON
                child.parent = parent.name
            WHERE
                parent.stock_entry_type = 'Material Receipt'
                AND parent.company = %s
                AND child.serial_no = %s
            ORDER BY
                parent.posting_date DESC, parent.posting_time DESC
            LIMIT 1
        """,
			(vehicle["dealer"], vehicle["name"]),
			as_dict=True,
		)

		if not mr:
			# If no material receipt found, skip this vehicle.
			continue

		mr_doc = mr[0]

		try:
			posting_datetime = datetime.strptime(
				f"{mr_doc.posting_date} {mr_doc.posting_time}", "%Y-%m-%d %H:%M"
			)
		except Exception:
			# Fallback: combine posting_date with midnight.
			posting_datetime = datetime.combine(mr_doc.posting_date, datetime.min.time())

		# Calculate the number of days in dealer stock
		days_in_stock = (now - posting_datetime).days

		dealer_raw = vehicle["dealer"] or ""
		if " - " in dealer_raw:
			dealer_name, dealer_code = dealer_raw.split(" - ", 1)
		else:
			dealer_name = dealer_raw
			dealer_code = ""

		data.append(
			[
				dealer_code,  # DealerCode
				dealer_name or "",  # DealerName
				"",  # RSM
				vehicle["catagory"] or "",  # Category
				vehicle["current_location"] or "",  # Territory
				"",  # ProductLine
				vehicle["description"] or "",  # ModelDescription
				vehicle["name"] or "",  # VINNumber
				vehicle["engine_no"] or "",  # EngineNo
				(vehicle["colour"].split(" - ")[0] if vehicle["colour"] else ""),  # Colour
				in_transit or "",  # InTransit
				days_in_stock or "",  # DaysInStock
				vehicle["ho_invoice_date"] or "",  # InvoiceDate
			]
		)

	# Write data to the CSV file
	with open(file_path, mode="w", newline="") as file:
		writer = csv.writer(file)
		writer.writerows(data)


@frappe.whitelist()
def outgoing_retail():
	# Define the output directory
	uon_outgoing_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/uon_integration/uon_outgoing"

	row_nr = 1

	# Get the current datetime
	now = datetime.now()
	yesterday_date = now - timedelta(days=1)

	# Format datetime as yyyyMMddHHmmss
	formatted_datetime = now.strftime("%Y%m%d%H%M%S")
	formatted_yesterday = yesterday_date.strftime("%Y%m%d")

	# Construct the filename
	filename = f"P-{formatted_datetime}-{formatted_yesterday}_RetailVehicleSales.csv"

	# Ensure the directory exists
	os.makedirs(uon_outgoing_folder, exist_ok=True)

	# Full file path
	file_path = os.path.join(uon_outgoing_folder, filename)

	# Header for the CSV file
	data = [
		[
			"Nr",
			"DealershipCode",
			"DealershipName",
			"RSM",
			"Category",
			"Territory",
			"ProductLine",
			"ModelDescription",
			"VIN",
			"EngineNo",
			"Colour",
			"RetailDate",
			"RegType",
			"InvoiceDate",
			"ShipmentNr",
			"CompanyName",
			"CompanyRegNo",
			"CustomerName",
			"CustomerSurname",
			"FinanceType",
			"FinanceBank",
			"OtherBank",
			"SalesPerson",
			"SalesOrigin",
			"OriginOther",
			"RegistrationType",
			"InsuredBy",
			"InsuredByOther",
			"CellNo",
			"HomePhone",
			"WorkPhone",
			"EmailAddress",
			"PostAddress",
			"PostSuburb",
			"PostCity",
			"PostCountry",
			"PostProvince",
			"PostZip",
			"StreetAddress",
			"StreetSuburb",
			"StreetCity",
			"StreetCountry",
			"StreetProvince",
			"StreetZip",
		]
	]

	# Fetch Vehicle Stock records where the dealer is the head office company
	sales = frappe.get_all("Vehicle Retail", filters={"docstatus": 1}, fields=["name"])

	for sale in sales:
		sale_doc = frappe.get_doc("Vehicle Retail", sale.name)

		if sale_doc.customer:
			cust_doc = frappe.get_doc("Dealer Customer", sale_doc.customer)
		elif sale_doc.fleet_customer:
			cust_doc = frappe.get_doc("Fleet Customer", sale_doc.fleet_customer)

		for vin in sale_doc.vehicles_sale_items:
			stock_doc = frappe.get_doc("Vehicle Stock", vin.get("vin_serial_no"))

			dealer_raw = sale_doc.dealer or ""
			if " - " in dealer_raw:
				dealer_name, dealer_code = dealer_raw.split(" - ", 1)
			else:
				dealer_name = dealer_raw
				dealer_code = ""

			ms = frappe.db.sql(
				"""
                SELECT
                    parent.name,
                    parent.posting_date,
                    parent.posting_time
                FROM
                    `tabStock Entry` AS parent
                JOIN
                    `tabStock Entry Detail` AS child
                ON
                    child.parent = parent.name
                WHERE
                    parent.stock_entry_type = 'Material Issue'
                    AND parent.company = %s
                    AND child.serial_no = %s
                ORDER BY
                    parent.posting_date DESC, parent.posting_time DESC
                LIMIT 1
            """,
				(sale_doc.dealer, vin.get("vin_serial_no")),
				as_dict=True,
			)

			if not ms:
				# If no material issue found, skip this vehicle.
				continue

			ms_doc = ms[0]

			try:
				posting_datetime = datetime.strptime(
					f"{ms_doc.posting_date} {ms_doc.posting_time}", "%Y/%m/%d %H:%M"
				)
			except Exception:
				# Fallback: combine posting_date with midnight.
				posting_datetime = datetime.combine(ms_doc.posting_date, datetime.min.time())

			# Search for the Vehicles Shipment document containing the serial_no
			shipment = frappe.db.sql(
				"""
                    SELECT
                        parent.name,
                        parent.shipment_file_no
                    FROM
                        `tabVehicles Shipment` AS parent
                    JOIN
                        `tabVehicles Shipment Items` AS child
                    ON
                        child.parent = parent.name
                    WHERE
                        child.vin_serial_no = %s
                """,
				(vin.get("vin_serial_no"),),
				as_dict=True,
			)

			if shipment:
				ship_no = shipment[0].shipment_file_no
			else:
				ship_no = ""

			data.append(
				[
					row_nr,
					dealer_code or "",  # DealershipCode
					dealer_name or "",  # DealershipName
					"",  # RSM
					stock_doc.catagory or "",  # Category
					stock_doc.current_location or "",  # Territory
					"",  # ProductLine
					stock_doc.description or "",  # ModelDescription
					vin.get("vin_serial_no") or "",  # VIN
					stock_doc.engine_no or "",  # EngineNo
					(stock_doc.colour.split(" - ")[0] if stock_doc.colour else ""),  # Colour
					posting_datetime or "",  # RetailDate
					sale_doc.sale_type or "",  # RegType
					stock_doc.ho_invoice_date or "",  # InvoiceDate
					ship_no or "",  # ShipmentNr
					cust_doc.company_name or "",  # CompanyName
					cust_doc.company_reg_no or "",  # CompanyRegNo
					cust_doc.customer_name or "",  # CustomerName
					cust_doc.customer_surname or "",  # CustomerSurname
					sale_doc.finance_method or "",  # FinanceType
					sale_doc.financed_by or "",  # FinanceBank
					"",  # OtherBank
					sale_doc.sales_person_full_names or "",  # SalesPerson
					"",  # SalesOrigin
					"",  # OriginOther
					sale_doc.sale_type or "",  # RegistrationType
					"",  # InsuredBy
					"",  # InsuredByOther
					cust_doc.mobile or "",  # CellNo
					cust_doc.phone or "",  # HomePhone
					cust_doc.work_phone or "",  # WorkPhone
					cust_doc.email or "",  # EmailAddress
					"",  # PostAddress
					"",  # PostSuburb
					"",  # PostCity
					"",  # PostCountry
					"",  # PostProvince
					"",  # PostZip
					cust_doc.address or "",  # StreetAddress
					cust_doc.suburb or "",  # StreetSuburb
					cust_doc.city_town or "",  # StreetCity
					cust_doc.country or "",  # StreetCountry
					cust_doc.province_state or "",  # StreetProvince
					cust_doc.code or "",  # StreetZip
				]
			)

			row_nr += 1

	# Write data to the CSV file
	with open(file_path, mode="w", newline="") as file:
		writer = csv.writer(file)
		writer.writerows(data)
