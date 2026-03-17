import frappe


@frappe.whitelist()
def get_active_recall_campaign(vin_serial_no, service_interval=None, from_service=0):
	from_service = int(from_service or 0)

	matches = frappe.get_all(
		"Recall Campaign Vehicles",
		filters={
			"vin_serial_no": vin_serial_no,
			"selected": 1,
		},
		fields=["parent"],
	)

	for match in matches:
		campaign = frappe.get_doc("Recall Campaign", match.parent)

		if not campaign.active:
			continue

		campaign_interval = (campaign.interval or "").strip()

		if campaign_interval and campaign_interval.lower() != "all":
			if from_service:
				if not service_interval or campaign_interval != service_interval:
					continue
			elif service_interval:
				if campaign_interval != service_interval:
					continue

		return campaign.as_dict()

	return None


@frappe.whitelist()
def create_warranty_claim_from_recall(vin_serial_no, campaign_name):

	campaign = frappe.get_doc("Recall Campaign", campaign_name)
	vehicle = frappe.db.get_value(
		"Vehicle Stock", vin_serial_no,
		["customer", "brand", "model", "model_year", "colour", "engine_no",
		 "register_no", "odo_reading", "warranty_start_date", "warranty_end_date"],
		as_dict=True,
	) or {}

	claim = frappe.new_doc("Vehicles Warranty Claims")
	claim.vin_serial_no = vin_serial_no
	claim.dealer = campaign.dealer
	claim.type = "Service Campaign"
	claim.status = "Pending"
	claim.summary = campaign.campaign_description or "Recall campaign"
	claim.fault = "Recall campaign"
	claim.cause = "Recall campaign"
	claim.remedy = "Recall campaign"
	claim.date_of_failure = frappe.utils.nowdate()
	claim.technician = frappe.session.user
	claim.reported_by = frappe.session.user

	if vehicle.get("model"):
		claim.model = vehicle.model
	if vehicle.get("customer"):
		claim.customer = vehicle.customer
	claim.odo_reading = vehicle.get("odo_reading") or 0

	for part in campaign.recall_campaign_parts or []:
		if not part.item:
			continue
		claim.append("part_items", {
			"part_no": part.item,
			"qty": part.qty or 1,
			"price": part.price or 0,
			"total_excl": part.total_excl or 0,
		})

	for labour in campaign.recall_campaign_labour or []:
		if not labour.item:
			continue
		claim.append("labour_items", {
			"labour_code": labour.item,
			"duration": labour.duration_hours or 1,
			"price": labour.rate_hour or 0,
			"total_excl": labour.total_excl or 0,
		})

	for extra in campaign.recall_campaign_extras or []:
		claim.append("extra_items", {
			"item_no": extra.item,
			"qty": extra.qty or 1,
			"price_per_item_excl": extra.price or 0,
			"total_excl": extra.total_excl or 0,
		})

	claim.flags.ignore_mandatory = True
	claim.insert(ignore_permissions=True)

	set_vehicle_selected_false(campaign_name, vin_serial_no)

	return claim.name


@frappe.whitelist()
def remove_vehicle_from_campaign(campaign_name, vin_serial_no):
	campaign = frappe.get_doc("Recall Campaign", campaign_name)

	campaign.recall_campaign_vehicles = [
		row for row in campaign.recall_campaign_vehicles
		if row.vin_serial_no != vin_serial_no
	]

	campaign.save(ignore_permissions=True)
	return True


@frappe.whitelist()
def set_vehicle_selected_false(campaign_name, vin_serial_no):
	campaign = frappe.get_doc("Recall Campaign", campaign_name)

	for row in campaign.recall_campaign_vehicles:
		if row.vin_serial_no == vin_serial_no:
			row.selected = 0

	campaign.save(ignore_permissions=True)

	plan_name = campaign._find_plan_name()
	plan_names_to_check = [campaign_name]
	if plan_name and plan_name != campaign_name:
		plan_names_to_check.append(plan_name)

	linked_plans = frappe.get_all(
		"Vehicle Linked Warranty Plan",
		filters={
			"vin_serial_no": vin_serial_no,
			"warranty_plan": ["in", plan_names_to_check],
		},
		fields=["name", "status"],
	)

	for linked_plan in linked_plans:
		if linked_plan.status != "Cancelled":
			frappe.db.set_value(
				"Vehicle Linked Warranty Plan",
				linked_plan.name,
				"status",
				"Cancelled",
			)

	return True
