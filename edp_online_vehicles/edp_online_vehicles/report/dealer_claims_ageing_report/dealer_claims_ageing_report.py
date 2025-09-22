# Copyright (c) 2025, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	# Ensure filters
	filters = filters or {}
	from_date = filters.get("from_date")
	to_date = filters.get("to_date")
	columns = get_columns()
	data = get_data(from_date, to_date)
	return columns, data


def get_columns():
	# Base columns
	cols = [
		{
			"label": _("Document ID"),
			"fieldname": "document_id",
			"fieldtype": "Link",
			"options": "Dealer Claims",
		},
		{"label": _("Dealer"), "fieldname": "dealer", "fieldtype": "Data"},
		{"label": _("Claim Date/Time"), "fieldname": "claim_datetime", "fieldtype": "Datetime"},
		{"label": _("Claim Amount"), "fieldname": "claim_amount", "fieldtype": "Currency"},
		{"label": _("Claim Category"), "fieldname": "claim_category", "fieldtype": "Data"},
		{"label": _("Claim Type Description"), "fieldname": "claim_type_description", "fieldtype": "Data"},
		{"label": _("Claim Type Code"), "fieldname": "claim_type_code", "fieldtype": "Data"},
	]

	# Dynamically fetch all claim_status options
	meta = frappe.get_meta("Dealer Claims")
	status_field = meta.get_field("claim_status")
	options = status_field.options.split("\n") if status_field and status_field.options else []

	# Add a column for each status
	for status in options:
		cols.append(
			{
				"label": _(status),
				"fieldname": frappe.scrub(status),
				"fieldtype": "Data",
			}
		)

	return cols


def get_data(from_date, to_date):
	# Fetch Dealer Claims in date range
	clauses = []
	if from_date:
		clauses.append("claim_datetime >= %(from_date)s")
	if to_date:
		clauses.append("claim_datetime <= %(to_date)s")
	where = " and ".join(clauses) or "1=1"

	claims = frappe.db.sql(
		f"select name, dealer, claim_datetime, claim_amt, claim_category, claim_description, claim_type_code"
		f" from `tabDealer Claims` where {where}",
		{"from_date": from_date, "to_date": to_date},
		as_dict=True,
	)

	# Fetch status columns
	options = [
		opt for opt in (frappe.get_meta("Dealer Claims").get_field("claim_status").options or "").split("\n")
	]
	status_cols = [frappe.scrub(opt) for opt in options]

	result = []
	for c in claims:
		# Initialize row
		row = {
			"document_id": c.name,
			"dealer": c.dealer,
			"claim_datetime": c.claim_datetime,
			"claim_amount": c.claim_amt,
			"claim_category": c.claim_category,
			"claim_type_description": c.claim_description,
			"claim_type_code": c.claim_type_code,
		}
		# blank for each status col
		for col in status_cols:
			row[col] = None

		# Only proceed if linked Status Tracker exists
		if frappe.db.exists("Status Tracker", {"document": c.name}):
			tracker = frappe.get_doc("Status Tracker", {"document": c.name})
			# Sum times per status
			durations = {}
			for st in tracker.status_tracking_table:
				stat = st.status
				elapsed = st.time_elapsed or ""
				secs = parse_duration_to_seconds(elapsed)
				durations.setdefault(stat, 0)
				durations[stat] += secs

			# Convert back to human
			for stat, total_secs in durations.items():
				col = frappe.scrub(stat)
				if col in status_cols:
					row[col] = format_seconds_to_duration(total_secs)
		# If no tracker, leave status columns blank

		result.append(row)

	return result


def parse_duration_to_seconds(duration_str):
	# e.g. "1 Day 3 Hours 12 Minutes 30 Seconds"
	import re

	total = 0
	patterns = {
		"Day": 86400,
		"Days": 86400,
		"Hour": 3600,
		"Hours": 3600,
		"Minute": 60,
		"Minutes": 60,
		"Second": 1,
		"Seconds": 1,
	}
	for pat, sec_val in patterns.items():
		match = re.search(r"(\d+) " + pat, duration_str)
		if match:
			total += int(match.group(1)) * sec_val
	return total


def format_seconds_to_duration(seconds):
	# Convert total seconds back to human readable
	parts = []
	intervals = [("Day", 86400), ("Hour", 3600), ("Minute", 60), ("Second", 1)]
	for name, count in intervals:
		value, seconds = divmod(seconds, count)
		if value:
			label = name + ("s" if value != 1 else "")
			parts.append(f"{value} {label}")
	return " ".join(parts)
