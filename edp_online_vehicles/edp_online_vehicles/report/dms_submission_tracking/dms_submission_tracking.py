

import frappe
from frappe import _
from frappe.utils import getdate, add_days, nowdate


def execute(filters=None):
	filters = filters or {}
	columns = get_columns(filters)
	data = get_data(filters)
	chart = get_chart(data, filters)
	summary = get_summary(data, filters)
	return columns, data, None, chart, summary


# ---------------------------------------------------------------------------
# Columns
# ---------------------------------------------------------------------------

def get_columns(filters):
	view = filters.get("view", "Submissions")

	if view == "Integration Log":
		return _integration_log_columns()

	return _submission_columns()


def _submission_columns():
	return [
		{
			"label": _("Submitted On"),
			"fieldname": "submitted_on",
			"fieldtype": "Datetime",
			"width": 170,
		},
		{
			"label": _("HQ Part Order"),
			"fieldname": "hq_part_order",
			"fieldtype": "Link",
			"options": "HQ Part Order",
			"width": 130,
		},
		{
			"label": _("Part Order No"),
			"fieldname": "part_order",
			"fieldtype": "Link",
			"options": "Part Order",
			"width": 130,
		},
		{
			"label": _("Dealer"),
			"fieldname": "dealer",
			"fieldtype": "Link",
			"options": "Company",
			"width": 200,
		},
		{
			"label": _("DMS Reference"),
			"fieldname": "dms_reference",
			"fieldtype": "Data",
			"width": 170,
		},
		{
			"label": _("Part No"),
			"fieldname": "part_no",
			"fieldtype": "Link",
			"options": "Item",
			"width": 160,
		},
		{
			"label": _("Description"),
			"fieldname": "description",
			"fieldtype": "Data",
			"width": 220,
		},
		{
			"label": _("Qty Submitted"),
			"fieldname": "qty_submitted",
			"fieldtype": "Int",
			"width": 110,
		},
		{
			"label": _("Evolve Invoice No"),
			"fieldname": "evolve_invoice_no",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Integration Status"),
			"fieldname": "integration_status",
			"fieldtype": "Data",
			"width": 130,
		},
		{
			"label": _("Dealer Order No"),
			"fieldname": "dealer_order_no",
			"fieldtype": "Data",
			"width": 130,
		},
		{
			"label": _("Sales Person"),
			"fieldname": "sales_person",
			"fieldtype": "Data",
			"width": 130,
		},
	]


def _integration_log_columns():
	return [
		{
			"label": _("Date / Time"),
			"fieldname": "request_datetime",
			"fieldtype": "Datetime",
			"width": 170,
		},
		{
			"label": _("Tracking ID"),
			"fieldname": "tracking_id",
			"fieldtype": "Link",
			"options": "Vehicle Tracking",
			"width": 130,
		},
		{
			"label": _("Action"),
			"fieldname": "action_summary",
			"fieldtype": "Data",
			"width": 300,
		},
		{
			"label": _("Status"),
			"fieldname": "status",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("Endpoint"),
			"fieldname": "integration_end_point",
			"fieldtype": "Data",
			"width": 170,
		},
		{
			"label": _("Response"),
			"fieldname": "response_status",
			"fieldtype": "Small Text",
			"width": 350,
		},
		{
			"label": _("HQ Order No"),
			"fieldname": "hq_order_no",
			"fieldtype": "Link",
			"options": "HQ Part Order",
			"width": 130,
		},
	]


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def get_data(filters):
	view = filters.get("view", "Submissions")

	if view == "Integration Log":
		return _get_integration_log_data(filters)

	return _get_submission_data(filters)


def _get_submission_data(filters):

	conditions = []
	values = {}

	if filters.get("from_date"):
		conditions.append("sub.submitted_on >= %(from_date)s")
		values["from_date"] = getdate(filters["from_date"])
	if filters.get("to_date"):
		conditions.append("sub.submitted_on <= %(to_date)s")
		values["to_date"] = add_days(getdate(filters["to_date"]), 1)
	if filters.get("dealer"):
		conditions.append("hq.dealer = %(dealer)s")
		values["dealer"] = filters["dealer"]
	if filters.get("part_no"):
		conditions.append("sub.part_no = %(part_no)s")
		values["part_no"] = filters["part_no"]
	if filters.get("dms_reference"):
		conditions.append("sub.dms_reference LIKE %(dms_reference)s")
		values["dms_reference"] = f"%{filters['dms_reference']}%"
	if filters.get("hq_part_order"):
		conditions.append("sub.parent = %(hq_part_order)s")
		values["hq_part_order"] = filters["hq_part_order"]

	where_clause = " AND ".join(conditions) if conditions else "1=1"

	data = frappe.db.sql(
		f"""
		SELECT
			sub.submitted_on,
			sub.parent        AS hq_part_order,
			hq.part_order,
			hq.dealer,
			sub.dms_reference,
			sub.part_no,
			sub.description,
			sub.qty_submitted,
			sub.evolve_invoice_no,
			hq.dealer_order_no,
			hq.sales_person
		FROM `tabPart Order DMS Submission` sub
		INNER JOIN `tabHQ Part Order` hq ON hq.name = sub.parent
		WHERE {where_clause}
		ORDER BY sub.submitted_on DESC
		""",
		values,
		as_dict=True,
	)

	dms_refs = list({r["dms_reference"] for r in data if r.get("dms_reference")})
	status_map = {}
	if dms_refs:
		for ref in dms_refs:
			vt = frappe.db.sql(
				"""
				SELECT status FROM `tabVehicle Tracking`
				WHERE action_summary LIKE %s
				  AND integration_end_point = 'Evolve - Parts Order'
				ORDER BY request_datetime DESC
				LIMIT 1
				""",
				(f"%{ref}%",),
				as_dict=True,
			)
			if vt:
				status_map[ref] = vt[0]["status"]

	for row in data:
		row["integration_status"] = status_map.get(row.get("dms_reference"), "Successful")

	status_filter = filters.get("status")
	if status_filter:
		data = [r for r in data if r.get("integration_status") == status_filter]

	return data


def _get_integration_log_data(filters):

	conditions = ["vt.type = 'Integration'"]
	values = {}

	ep_filter = filters.get("endpoint")
	if ep_filter:
		conditions.append("vt.integration_end_point = %(endpoint)s")
		values["endpoint"] = ep_filter
	else:
		conditions.append(
			"vt.integration_end_point IN "
			"('Evolve - Parts Order', 'Evolve - Service', 'Evolve - Warranty')"
		)

	if filters.get("from_date"):
		conditions.append("vt.request_datetime >= %(from_date)s")
		values["from_date"] = getdate(filters["from_date"])
	if filters.get("to_date"):
		conditions.append("vt.request_datetime <= %(to_date)s")
		values["to_date"] = add_days(getdate(filters["to_date"]), 1)

	status_filter = filters.get("status")
	if status_filter:
		conditions.append("vt.status = %(status)s")
		values["status"] = status_filter

	where_clause = " AND ".join(conditions)

	return frappe.db.sql(
		f"""
		SELECT
			vt.request_datetime,
			vt.name             AS tracking_id,
			vt.action_summary,
			vt.status,
			vt.integration_end_point,
			vt.response_status,
			vt.hq_order_no
		FROM `tabVehicle Tracking` vt
		WHERE {where_clause}
		ORDER BY vt.request_datetime DESC
		""",
		values,
		as_dict=True,
	)


# ---------------------------------------------------------------------------
# Chart
# ---------------------------------------------------------------------------

def get_chart(data, filters):
	view = filters.get("view", "Submissions")

	if view == "Integration Log":
		return _integration_log_chart(data)

	return _submission_chart(data)


def _submission_chart(data):
	if not data:
		return None

	from collections import defaultdict

	daily = defaultdict(int)
	for row in data:
		if row.get("submitted_on"):
			day = str(getdate(row["submitted_on"]))
			daily[day] += row.get("qty_submitted", 0)

	if not daily:
		return None

	labels = sorted(daily.keys())
	values = [daily[d] for d in labels]

	return {
		"data": {
			"labels": labels,
			"datasets": [{"name": _("Parts Submitted"), "values": values}],
		},
		"type": "bar",
		"colors": ["#4CB944"],
		"barOptions": {"stacked": False},
	}


def _integration_log_chart(data):
	if not data:
		return None

	from collections import defaultdict

	by_status = defaultdict(lambda: defaultdict(int))
	for row in data:
		if row.get("request_datetime"):
			day = str(getdate(row["request_datetime"]))
			status = row.get("status", "Unknown")
			by_status[status][day] += 1

	all_days = sorted({d for counts in by_status.values() for d in counts})
	if not all_days:
		return None

	color_map = {"Successful": "#4CB944", "Failed": "#E74C3C", "Pending": "#F39C12"}
	datasets = []
	for status in sorted(by_status.keys()):
		datasets.append({
			"name": status,
			"values": [by_status[status].get(d, 0) for d in all_days],
		})

	return {
		"data": {"labels": all_days, "datasets": datasets},
		"type": "bar",
		"colors": [color_map.get(ds["name"], "#3498DB") for ds in datasets],
		"barOptions": {"stacked": True},
	}


# ---------------------------------------------------------------------------
# Summary cards
# ---------------------------------------------------------------------------

def get_summary(data, filters):
	view = filters.get("view", "Submissions")

	if view == "Integration Log":
		total = len(data)
		successful = sum(1 for r in data if r.get("status") == "Successful")
		failed = sum(1 for r in data if r.get("status") == "Failed")
		return [
			{
				"value": total,
				"indicator": "Blue",
				"label": _("Total Entries"),
				"datatype": "Int",
			},
			{
				"value": successful,
				"indicator": "Green",
				"label": _("Successful"),
				"datatype": "Int",
			},
			{
				"value": failed,
				"indicator": "Red",
				"label": _("Failed"),
				"datatype": "Int",
			},
		]

	total_parts = sum(r.get("qty_submitted", 0) for r in data)
	unique_orders = len({r.get("hq_part_order") for r in data if r.get("hq_part_order")})
	unique_refs = len({r.get("dms_reference") for r in data if r.get("dms_reference")})
	unique_dealers = len({r.get("dealer") for r in data if r.get("dealer")})

	return [
		{
			"value": unique_refs,
			"indicator": "Blue",
			"label": _("DMS Submissions"),
			"datatype": "Int",
		},
		{
			"value": total_parts,
			"indicator": "Green",
			"label": _("Total Parts Submitted"),
			"datatype": "Int",
		},
		{
			"value": unique_orders,
			"indicator": "Purple",
			"label": _("HQ Part Orders"),
			"datatype": "Int",
		},
		{
			"value": unique_dealers,
			"indicator": "Orange",
			"label": _("Dealers"),
			"datatype": "Int",
		},
	]
