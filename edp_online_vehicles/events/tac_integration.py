import json
import os
import shutil
import xml.etree.ElementTree as ET
from datetime import datetime

import frappe
import paramiko


@frappe.whitelist()
def tac_landing_outgoing(selected_items):
	selected_items = json.loads(selected_items)
	folder_path = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/tac_integration/tac_outgoing"
	error_log_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/integration_errors/tac_outgoing"

	# Ensure the error log folder exists
	os.makedirs(error_log_folder, exist_ok=True)

	now = datetime.now()

	# Format it as yyMMddHHmmss
	formatted_datetime = now.strftime("%y%m%d%H%M%S")

	for item in selected_items:
		vinno = item.get("vin_serial_no")
		model = item.get("model_code")
		engine_no = item.get("engine_no")

		filename = "MSA_Tac_Landing_" + vinno + "_" + formatted_datetime + ".txt"

		file_path = os.path.join(folder_path, filename)

		content_datetime = now.strftime("%Y-%m-%d %H:%M:%S") + f".{now.microsecond // 1000:03d}"

		content = f'"Mahindra","TAC","{content_datetime}","Shipment Upload","{vinno}","","{model}","","","{engine_no}"'

		try:
			if frappe.db.exists("Vehicle Stock", vinno):
				with open(file_path, "w") as file:
					file.write(content)

				new_tracking_doc = frappe.new_doc("Vehicle Tracking")

				tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

				new_tracking_doc.vin_serial_no = vinno
				new_tracking_doc.action_summary = "Shipment Upload File sent"
				new_tracking_doc.type = "Integration"
				new_tracking_doc.integration_end_point = "TAC"
				new_tracking_doc.request_datetime = tracking_date_time

				new_tracking_doc.request = f"""Shipment Upload file sent to TAC:

                {content}"""

				new_tracking_doc.insert(ignore_permissions=True)
				frappe.db.commit()

		except Exception as e:
			# Log the error to a text file
			error_log_file = os.path.join(error_log_folder, "error_log_tac_landing.txt")
			error_message = f"Error writing file for VIN {vinno}: {e!s}\n"
			with open(error_log_file, "a") as error_file:
				error_file.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]: {error_message}")


@frappe.whitelist()
def tac_delivery_outgoing(vinno, model, model_desc, colour, dealer):
	folder_path = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/tac_integration/tac_outgoing"
	error_log_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/integration_errors/tac_outgoing"

	# Ensure the error log folder exists
	os.makedirs(error_log_folder, exist_ok=True)

	now = datetime.now()

	# Format it as yyMMddHHmmss
	formatted_datetime = now.strftime("%y%m%d%H%M%S")

	vinno = vinno
	model = model
	model_desc = model_desc
	colour = colour

	address_links = frappe.get_all(
		"Dynamic Link",
		filters={"link_doctype": "Company", "link_name": dealer, "parenttype": "Address"},
		fields=["parent"],
	)

	dealer_doc = frappe.get_doc("Company", dealer)

	formatted_address = ""
	formatted_dealer = dealer.split(" - ")[0]

	for link in address_links:
		address_doc = frappe.get_doc("Address", link["parent"])
		if address_doc.address_type == "Shipping":
			formatted_address = f"{formatted_dealer},{formatted_dealer},{address_doc.address_line1},{address_doc.city},{address_doc.country},{address_doc.pincode}"
			break

	if not formatted_address:
		formatted_address = f"{formatted_dealer},{formatted_dealer},,,,"

	filename = "MSA_TAC_Delivery_" + vinno + "_" + formatted_datetime + ".txt"

	file_path = os.path.join(folder_path, filename)

	content_datetime = now.strftime("%Y-%m-%d %H:%M:%S") + f".{now.microsecond // 1000:03d}"

	content = f'"Mahindra","TAC","{content_datetime}","Carrier Delivery Instruction","{model}","{model_desc}","","","","{vinno}","","{colour}","","{dealer_doc.phone_no}","{formatted_address}"'

	try:
		if frappe.db.exists("Vehicle Stock", vinno):
			with open(file_path, "w") as file:
				file.write(content)

			new_tracking_doc = frappe.new_doc("Vehicle Tracking")

			tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

			new_tracking_doc.vin_serial_no = vinno
			new_tracking_doc.action_summary = "Delivery Instruction Sent"
			new_tracking_doc.type = "Integration"
			new_tracking_doc.integration_end_point = "TAC"
			new_tracking_doc.request_datetime = tracking_date_time

			new_tracking_doc.request = f"""Carrier Delivery Instruction file created and sent to TAC:

            {content}"""

			new_tracking_doc.insert(ignore_permissions=True)
			frappe.db.commit()

	except Exception as e:
		# Log the error to a text file
		error_log_file = os.path.join(error_log_folder, "error_log_tac_delivery.txt")
		error_message = f"Error writing file for VIN {vinno}: {e!s}\n"
		with open(error_log_file, "a") as error_file:
			error_file.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]: {error_message}")


@frappe.whitelist()
def read_tac_file():
	incoming_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/tac_integration/tac_incoming"
	processed_folder = os.path.join(incoming_folder, "Processed")
	error_log_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/integration_errors/tac_incoming"
	empty_files_folder = os.path.join(error_log_folder, "empty_files")

	# Ensure the required folders exist
	os.makedirs(processed_folder, exist_ok=True)
	os.makedirs(error_log_folder, exist_ok=True)
	os.makedirs(empty_files_folder, exist_ok=True)

	try:
		process_all_files(incoming_folder, processed_folder, error_log_folder, empty_files_folder)
	except Exception as e:
		log_error(error_log_folder, f"Error processing files: {e!s}")


def process_all_files(incoming_folder, processed_folder, error_log_folder, empty_files_folder):
	"""Processes all files in the incoming folder and moves them after processing."""
	try:
		for filename in os.listdir(incoming_folder):
			file_path = os.path.join(incoming_folder, filename)

			if os.path.isfile(file_path) and filename.startswith("MSA_Tac_noxml_"):
				parsed_data = process_supplier_file(file_path, error_log_folder, empty_files_folder, filename)

				if parsed_data is None:
					print(f"File {filename} is empty or could not be processed.")

				# Move the file to the Processed folder even if empty
				shutil.move(file_path, os.path.join(processed_folder, filename))

				if parsed_data is not None:
					for data in parsed_data:
						now = datetime.now()

						new_tracking_doc = frappe.new_doc("Vehicle Tracking")

						tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")

						new_tracking_doc.vin_serial_no = data["VIN"]
						new_tracking_doc.action_summary = "Vehicle Delivery Confirmation Received"
						new_tracking_doc.type = "Integration"
						new_tracking_doc.integration_end_point = "TAC"
						new_tracking_doc.request_datetime = tracking_date_time

						new_tracking_doc.request = f"""Data Received for VIN {data["VIN"]}:

                        {data}"""

						new_tracking_doc.insert(ignore_permissions=True)

	except Exception as e:
		log_error(error_log_folder, f"Error processing files: {e!s}")


def process_supplier_file(file_path, error_log_folder, empty_files_folder, filename):
	"""Reads and processes a supplier interface file."""
	try:
		with open(file_path) as file:
			lines = file.readlines()

		if not lines:
			log_empty_file(empty_files_folder, filename)
			return None

		parsed_data_list = []

		for line in lines:
			line = line.strip()

			if not line:
				continue

			try:
				root = ET.fromstring(line)
				data_string = root.text

				data_parts = data_string.split("|")

				if len(data_parts) < 8:
					log_error(error_log_folder, f"Skipping malformed line in {file_path}: {line}")
					continue

				parsed_data = {
					"DMS": data_parts[0],
					"Company": data_parts[1],
					"Timestamp": data_parts[2],
					"Action Type": data_parts[3],
					"Status": data_parts[4],
					"Info": data_parts[5],
					"VIN": data_parts[6],
					"Code": data_parts[7],
				}

				parsed_data_list.append(parsed_data)

			except ET.ParseError as e:
				log_error(error_log_folder, f"XML parsing error in {file_path}: {e!s}")

		return parsed_data_list if parsed_data_list else None

	except Exception as e:
		log_error(error_log_folder, f"Error reading file {file_path}: {e!s}")
		return None


def log_error(error_log_folder, message):
	"""Logs errors to a general error log file."""
	error_log_file = os.path.join(error_log_folder, "error_log_tac_incoming_xml_read.txt")
	with open(error_log_file, "a") as error_file:
		error_file.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]: {message}\n")


def log_empty_file(empty_files_folder, filename):
	"""Logs empty file names to 'tac_empty_files.txt'."""
	empty_files_log = os.path.join(empty_files_folder, "tac_empty_files.txt")
	with open(empty_files_log, "a") as empty_file_log:
		empty_file_log.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]: {filename}\n")


@frappe.whitelist()
def tac_sftp():
	hostname = "edpsecure.co.za"
	port = 22
	username = "tacuser"
	password = "T@cUs3r2025"

	tac_incoming_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/tac_integration/tac_incoming"
	tac_outgoing_folder = "/home/joh305/bench-15/apps/edp_online_vehicles/edp_online_vehicles/tac_integration/tac_outgoing"

	remote_incoming_folder = "/Incoming"
	remote_outgoing_folder = "/Outgoing"

	transport = paramiko.Transport((hostname, port))
	transport.connect(username=username, password=password)
	sftp = paramiko.SFTPClient.from_transport(transport)

	sftp.chdir(remote_incoming_folder)
	remote_files = sftp.listdir()

	os.makedirs(tac_incoming_folder, exist_ok=True)

	for filename in remote_files:
		if filename.lower().endswith(".txt"):
			local_path = os.path.join(tac_incoming_folder, filename)
			sftp.get(filename, local_path)
			sftp.remove(filename)

	sftp.chdir(remote_outgoing_folder)

	for filename in os.listdir(tac_outgoing_folder):
		# Only process files that end with .txt
		if filename.lower().endswith(".txt"):
			local_path = os.path.join(tac_outgoing_folder, filename)
			if os.path.isfile(local_path):
				# sftp.put() transfers the file from local to remote
				sftp.put(local_path, filename)

				if os.path.isfile(local_path):
					os.remove(local_path)

	# Close the FTP connection
	sftp.close()
	transport.close()
