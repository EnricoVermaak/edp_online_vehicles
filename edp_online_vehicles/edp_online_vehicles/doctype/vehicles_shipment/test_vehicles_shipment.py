# Copyright (c) 2024, NexTash and Contributors
# See license.txt
"""
bench --site <your_site> run-tests --app edp_online_vehicles \
        --module edp_online_vehicles.edp_online_vehicles.doctype.vehicles_shipment.test_vehicles_shipment
"""

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, getdate, today as frappe_today

_BRAND = "_TST-ShipBrand"
_MODEL = "_TST-MODEL-SHIP01"
_COLOUR = f"Silver - {_MODEL}"
_SUPPLIER = "_TST-ShipSupplier"
_PURPOSE = "_TST-ShipPurpose"

_COMPANY = frappe.db.get_value("Company", {}, "name") or "_Test Company"
_WAREHOUSE = frappe.db.get_value("Warehouse", {"is_group": 0, "company": _COMPANY}, "name") or "Stores - _TC"

_VIN_A = "TSTSHIPVIN-AAA-001"
_VIN_B = "TSTSHIPVIN-BBB-002"
_VIN_C = "TSTSHIPVIN-CCC-003"

_STRESS_VIN_COUNT = 30
_STRESS_VINS = [f"TSTSHIPVIN-STRESS-{i:03d}" for i in range(1, _STRESS_VIN_COUNT + 1)]

def _all_test_vins():
	return (_VIN_A, _VIN_B, _VIN_C) + tuple(_STRESS_VINS)


def _item(vin, model=_MODEL, colour=_COLOUR, warehouse=_WAREHOUSE):
	return {
		"vin_serial_no": vin,
		"model_code": model,
		"model_description": "Test Shipment Model",
		"engine_no": f"ENG-{vin}",
		"colour": colour,
		"cost_price_excl": 150_000,
		"target_warehouse": warehouse,
		"stock_no": "",
	}


def _del_if_exists(doctype, name):
	if frappe.db.exists(doctype, name):
		frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)


class TestVehiclesShipment(FrappeTestCase):

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._commit_patcher = patch.object(frappe.db, "commit", lambda: None)
		cls._commit_patcher.start()
		cls.addClassCleanup(cls._commit_patcher.stop)
		cls._create_fixtures()

	@classmethod
	def _create_fixtures(cls):
		if not frappe.db.exists("Brand", _BRAND):
			frappe.get_doc({"doctype": "Brand", "brand": _BRAND}).insert(ignore_permissions=True)

		cls._category = frappe.db.get_value("Vehicles Category", {}, "name") or "Code"

		if not frappe.db.exists("Model Administration", _MODEL):
			frappe.get_doc({
				"doctype": "Model Administration",
				"model_code": _MODEL,
				"model_description": "Test Shipment Model",
				"brand": _BRAND,
				"series_code": "TST",
				"category": cls._category,
				"automatically_reserve_model": 0,
			}).insert(ignore_permissions=True)

		if not frappe.db.exists("Model Colour", _COLOUR):
			frappe.get_doc({
				"doctype": "Model Colour",
				"colour": "Silver",
				"model": _MODEL,
			}).insert(ignore_permissions=True)

		sg = frappe.db.get_value("Supplier Group", {}, "name") or "All Supplier Groups"
		if not frappe.db.exists("Supplier", _SUPPLIER):
			frappe.get_doc({
				"doctype": "Supplier",
				"supplier_name": _SUPPLIER,
				"supplier_group": sg,
			}).insert(ignore_permissions=True)

		if not frappe.db.exists("Item", _MODEL):
			item_group = frappe.db.get_value("Item Group", {}, "name") or "All Item Groups"
			stock_uom = frappe.db.get_value("UOM", {}, "name") or "Nos"
			frappe.get_doc({
				"doctype": "Item",
				"item_code": _MODEL,
				"item_name": "Test Shipment Model",
				"item_group": item_group,
				"stock_uom": stock_uom,
				"is_stock_item": 1,
			}).insert(ignore_permissions=True)

		frappe.db.commit()

	def setUp(self):
		self._create_fixtures()
		for vin in _all_test_vins():
			_del_if_exists("Vehicle Stock", vin)
			_del_if_exists("Reserved Vehicles", vin)

	def tearDown(self):
		for vin in _all_test_vins():
			_del_if_exists("Vehicle Stock", vin)
			_del_if_exists("Reserved Vehicles", vin)
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 0)
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_create_stock_number", 0)
		frappe.db.set_single_value("Vehicle Stock Settings", "sla_days", 0)
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 0)
		frappe.db.rollback()

	def _make_shipment(self, items=None, **kwargs):
		if items is None:
			items = [_item(_VIN_A)]
		doc = frappe.get_doc({
			"doctype": "Vehicles Shipment",
			"supplier": _SUPPLIER,
			"shipment_file_no": "TST-FILE-001",
			"dealer": _COMPANY,
			"target_warehouse": _WAREHOUSE,
			"vehicles_shipment_items": items,
			**kwargs,
		})
		doc.insert(ignore_permissions=True)
		return doc

	def _receive(self, shipment_doc, vins, patch_se=True):
		items_json = frappe.as_json([_item(v) for v in vins])
		if patch_se:
			target = (
				"edp_online_vehicles.edp_online_vehicles.doctype"
				".vehicles_shipment.vehicles_shipment"
				".VehiclesShipment.create_stock_entry_for_serial_numbers"
			)
			with patch(target, return_value="Received"):
				return shipment_doc.create_stock_entry(items_json)
		return shipment_doc.create_stock_entry(items_json)

	def test_validate_auto_stock_number_assigned(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_create_stock_number", 1)
		frappe.db.set_single_value("Vehicle Stock Settings", "last_automated_stock_no", "MSA000100")
		doc = self._make_shipment()
		item = doc.vehicles_shipment_items[0]
		self.assertTrue(item.stock_no, "stock_no was not assigned")
		self.assertTrue(item.stock_no.startswith("MSA"), "prefix not applied")
		self.assertEqual(item.stock_no, "MSA000101")

	def test_validate_auto_stock_number_skips_row_with_existing_stock_no(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_create_stock_number", 1)
		frappe.db.set_single_value("Vehicle Stock Settings", "last_automated_stock_no", "MSA000100")
		items = [_item(_VIN_A)]
		items[0]["stock_no"] = "EXISTING-001"
		doc = self._make_shipment(items=items)
		self.assertEqual(doc.vehicles_shipment_items[0].stock_no, "EXISTING-001")

	def test_validate_auto_stock_number_disabled_does_nothing(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_create_stock_number", 0)
		doc = self._make_shipment()
		self.assertFalse(doc.vehicles_shipment_items[0].stock_no)

	def test_validate_eta_warehouse_computed_from_sla(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "sla_days", 7)
		eta_harbour = frappe_today()
		doc = self._make_shipment(eta_harbour=eta_harbour)
		self.assertIsNotNone(doc.eta_warehouse)
		self.assertEqual(getdate(doc.eta_warehouse), getdate(add_days(eta_harbour, 7)))

	def test_validate_eta_warehouse_not_overwritten(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "sla_days", 7)
		explicit = "2099-06-30"
		doc = self._make_shipment(eta_warehouse=explicit, eta_harbour=frappe_today())
		self.assertEqual(getdate(doc.eta_warehouse), getdate(explicit))

	def test_validate_eta_warehouse_sla_zero_does_nothing(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "sla_days", 0)
		doc = self._make_shipment(eta_harbour=frappe_today())
		self.assertFalse(doc.eta_warehouse)

	def test_filter_passes_all_new_vins(self):
		from edp_online_vehicles.edp_online_vehicles.doctype.vehicles_shipment.vehicles_shipment import (
			_filter_already_received,
		)
		items = [_item(_VIN_A), _item(_VIN_B)]
		result = _filter_already_received(items)
		self.assertEqual(len(result), 2)

	def test_filter_excludes_already_received_vin(self):
		from edp_online_vehicles.edp_online_vehicles.doctype.vehicles_shipment.vehicles_shipment import (
			_filter_already_received,
		)
		frappe.db.sql(
			"INSERT IGNORE INTO `tabVehicle Stock` (name, vin_serial_no, creation, modified, owner, modified_by) "
			"VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator')",
			(_VIN_A, _VIN_A),
		)
		items = [_item(_VIN_A), _item(_VIN_B)]
		result = _filter_already_received(items)
		self.assertEqual(len(result), 1)
		self.assertEqual(result[0]["vin_serial_no"], _VIN_B)

	def test_filter_empty_list(self):
		from edp_online_vehicles.edp_online_vehicles.doctype.vehicles_shipment.vehicles_shipment import (
			_filter_already_received,
		)
		self.assertEqual(_filter_already_received([]), [])

	def test_filter_all_already_received(self):
		from edp_online_vehicles.edp_online_vehicles.doctype.vehicles_shipment.vehicles_shipment import (
			_filter_already_received,
		)
		for vin in (_VIN_A, _VIN_B):
			frappe.db.sql(
				"INSERT IGNORE INTO `tabVehicle Stock` (name, vin_serial_no, creation, modified, owner, modified_by) "
				"VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator')",
				(vin, vin),
			)
		result = _filter_already_received([_item(_VIN_A), _item(_VIN_B)])
		self.assertEqual(result, [])

	def test_receive_returns_received(self):
		doc = self._make_shipment()
		result = self._receive(doc, [_VIN_A])
		self.assertEqual(result, "Received")

	def test_receive_creates_vehicle_stock(self):
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self.assertTrue(
			frappe.db.exists("Vehicle Stock", {"vin_serial_no": _VIN_A}),
			"Vehicle Stock was not created for VIN_A",
		)

	def test_receive_vehicle_stock_available_by_default(self):
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 0)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		status = frappe.db.get_value("Vehicle Stock", _VIN_A, "availability_status")
		self.assertEqual(status, "Available")

	def test_receive_vehicle_stock_records_shipment_id(self):
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		shipment_id = frappe.db.get_value("Vehicle Stock", _VIN_A, "shipment_id")
		self.assertEqual(shipment_id, doc.name)

	def test_receive_vehicle_stock_ho_date_received_is_today(self):
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		ho_date = frappe.db.get_value("Vehicle Stock", _VIN_A, "ho_date_received")
		self.assertEqual(getdate(ho_date), getdate(frappe_today()))

	def test_receive_multiple_vins_creates_multiple_vehicle_stocks(self):
		doc = self._make_shipment(items=[_item(_VIN_A), _item(_VIN_B)])
		self._receive(doc, [_VIN_A, _VIN_B])
		for vin in (_VIN_A, _VIN_B):
			self.assertTrue(
				frappe.db.exists("Vehicle Stock", {"vin_serial_no": vin}),
				f"Vehicle Stock was not created for {vin}",
			)

	def test_double_receive_returns_received_silently(self):
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		result = self._receive(doc, [_VIN_A])
		self.assertEqual(result, "Received")

	def test_double_receive_does_not_create_duplicate_vehicle_stock(self):
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self._receive(doc, [_VIN_A])
		count = frappe.db.count("Vehicle Stock", {"vin_serial_no": _VIN_A})
		self.assertEqual(count, 1)

	def test_mixed_receive_skips_already_received_only_processes_new(self):
		doc = self._make_shipment(items=[_item(_VIN_A), _item(_VIN_B)])
		self._receive(doc, [_VIN_A])
		self._receive(doc, [_VIN_A, _VIN_B])
		self.assertTrue(frappe.db.exists("Vehicle Stock", {"vin_serial_no": _VIN_B}))
		self.assertEqual(frappe.db.count("Vehicle Stock", {"vin_serial_no": _VIN_A}), 1)

	def test_receive_all_already_received_returns_received_without_calling_stock_entry(self):
		frappe.db.sql(
			"INSERT IGNORE INTO `tabVehicle Stock` (name, vin_serial_no, creation, modified, owner, modified_by) "
			"VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator')",
			(_VIN_A, _VIN_A),
		)
		doc = self._make_shipment()
		target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			".VehiclesShipment.create_stock_entry_for_serial_numbers"
		)
		with patch(target) as mock_se:
			result = doc.create_stock_entry(frappe.as_json([_item(_VIN_A)]))
		self.assertEqual(result, "Received")
		mock_se.assert_not_called()

	def test_auto_reserve_model_sets_status_reserved(self):
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 1)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		status = frappe.db.get_value("Vehicle Stock", _VIN_A, "availability_status")
		self.assertEqual(status, "Reserved")

	def test_auto_reserve_model_creates_reserved_vehicles_doc(self):
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 1)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self.assertTrue(
			frappe.db.exists("Reserved Vehicles", {"vin_serial_no": _VIN_A}),
			"Reserved Vehicles was not created",
		)

	def test_auto_reserve_model_off_does_not_create_reserved_vehicles(self):
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 0)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self.assertFalse(
			frappe.db.exists("Reserved Vehicles", {"vin_serial_no": _VIN_A}),
			"Reserved Vehicles should NOT have been created",
		)

	def test_auto_reserve_from_settings_creates_reserved_vehicles(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 1)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		rv = frappe.db.get_value("Reserved Vehicles", {"vin_serial_no": _VIN_A}, "status")
		self.assertEqual(rv, "Reserved")

	def test_auto_reserve_from_settings_updates_vehicle_stock_status(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 1)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		status = frappe.db.get_value("Vehicle Stock", _VIN_A, "availability_status")
		self.assertEqual(status, "Reserved")

	def test_auto_reserve_from_settings_off_leaves_available(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 0)
		frappe.db.set_value("Model Administration", _MODEL, "automatically_reserve_model", 0)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self.assertFalse(frappe.db.exists("Reserved Vehicles", {"vin_serial_no": _VIN_A}))

	def test_auto_reserve_from_settings_skips_already_reserved_vin(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 1)
		frappe.get_doc({
			"doctype": "Reserved Vehicles",
			"vin_serial_no": _VIN_A,
			"dealer": _COMPANY,
			"status": "Reserved",
			"reserve_reason": "Pre-test fixture",
		}).insert(ignore_permissions=True)
		doc = self._make_shipment()
		result = self._receive(doc, [_VIN_A])
		self.assertEqual(result, "Received")
		self.assertEqual(frappe.db.count("Reserved Vehicles", {"vin_serial_no": _VIN_A}), 1)

	def test_hq_order_auto_allocate_path_runs_without_error(self):
		if not frappe.db.exists("Vehicles Order Purpose", _PURPOSE):
			frappe.get_doc({
				"doctype": "Vehicles Order Purpose",
				"description": _PURPOSE,
				"automatically_allocate_received_shipments": 1,
			}).insert(ignore_permissions=True)

		doc = self._make_shipment()
		fire_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".head_office_vehicle_orders.head_office_vehicle_orders"
			"._fire_on_vehicle_allocated"
		)
		with patch(fire_target):
			result = self._receive(doc, [_VIN_A])

		self.assertEqual(result, "Received")

	def test_hq_order_not_allocated_when_no_purpose_configured(self):
		frappe.db.sql(
			"UPDATE `tabVehicles Order Purpose` SET automatically_allocate_received_shipments = 0"
		)
		doc = self._make_shipment()
		self._receive(doc, [_VIN_A])
		self.assertFalse(
			frappe.db.get_value("Head Office Vehicle Orders", {"vinserial_no": _VIN_A}, "name")
		)

	def test_create_vehicle_plans_no_plans_returns_message_not_error(self):
		frappe.db.set_value("Model Administration", _MODEL, "default_warranty_plan", None)
		frappe.db.set_value("Model Administration", _MODEL, "default_service_plan", None)
		doc = self._make_shipment()
		result = doc.create_vehicle_plans(_VIN_A, _MODEL)
		self.assertIsInstance(result, str)
		self.assertFalse(result.startswith("Created"))

	def test_shipment_received_hook_is_fired_after_successful_receive(self):
		hook_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			"._fire_on_vehicle_shipment_received"
		)
		doc = self._make_shipment()
		with patch(hook_target) as mock_hook:
			self._receive(doc, [_VIN_A])
		mock_hook.assert_called_once()

	def test_shipment_received_hook_not_fired_when_all_already_received(self):
		frappe.db.sql(
			"INSERT IGNORE INTO `tabVehicle Stock` (name, vin_serial_no, creation, modified, owner, modified_by) "
			"VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator')",
			(_VIN_A, _VIN_A),
		)
		hook_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			"._fire_on_vehicle_shipment_received"
		)
		doc = self._make_shipment()
		se_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			".VehiclesShipment.create_stock_entry_for_serial_numbers"
		)
		with patch(se_target, return_value="Received"), patch(hook_target) as mock_hook:
			doc.create_stock_entry(frappe.as_json([_item(_VIN_A)]))
		mock_hook.assert_not_called()

	def test_exception_in_receive_triggers_rollback(self):
		doc = self._make_shipment()
		se_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			".VehiclesShipment.create_stock_entry_for_serial_numbers"
		)
		vs_target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			".VehiclesShipment.create_vehicles_stock_entries"
		)
		rollback_target = "frappe.db.rollback"
		with patch(rollback_target) as mock_rollback, \
				patch(se_target, return_value="Received"), \
				patch(vs_target, side_effect=RuntimeError("Simulated failure")):
			with self.assertRaises(RuntimeError):
				doc.create_stock_entry(frappe.as_json([_item(_VIN_A)]))
			mock_rollback.assert_called_once()

	def test_stress_receive_large_batch_creates_all_vehicle_stock(self):
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		result = self._receive(doc, _STRESS_VINS)
		self.assertEqual(result, "Received")
		for vin in _STRESS_VINS:
			self.assertTrue(
				frappe.db.exists("Vehicle Stock", {"vin_serial_no": vin}),
				f"Vehicle Stock missing for {vin}",
			)
		self.assertEqual(
			frappe.db.count("Vehicle Stock", {"vin_serial_no": ["in", list(_STRESS_VINS)]}),
			_STRESS_VIN_COUNT,
		)

	def test_stress_double_receive_large_batch_silent_no_duplicates(self):
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		self._receive(doc, _STRESS_VINS)
		result = self._receive(doc, _STRESS_VINS)
		self.assertEqual(result, "Received")
		for vin in _STRESS_VINS:
			self.assertEqual(
				frappe.db.count("Vehicle Stock", {"vin_serial_no": vin}),
				1,
				f"Duplicate Vehicle Stock for {vin}",
			)

	def test_stress_mixed_receive_many_already_received_and_many_new(self):
		half = _STRESS_VIN_COUNT // 2
		first_batch = _STRESS_VINS[:half]
		second_batch = _STRESS_VINS[half:]
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		self._receive(doc, first_batch)
		result = self._receive(doc, _STRESS_VINS)
		self.assertEqual(result, "Received")
		for vin in _STRESS_VINS:
			self.assertEqual(
				frappe.db.count("Vehicle Stock", {"vin_serial_no": vin}),
				1,
				f"Wrong count for {vin}",
			)
		self.assertEqual(
			frappe.db.count("Vehicle Stock", {"vin_serial_no": ["in", list(_STRESS_VINS)]}),
			_STRESS_VIN_COUNT,
		)

	def test_stress_validate_auto_stock_numbers_many_items(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_create_stock_number", 1)
		frappe.db.set_single_value("Vehicle Stock Settings", "last_automated_stock_no", "MSA001000")
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		seen = set()
		for i, row in enumerate(doc.vehicles_shipment_items):
			self.assertTrue(row.stock_no, f"Row {i+1} missing stock_no")
			self.assertTrue(row.stock_no.startswith("MSA"), f"Row {i+1} wrong prefix")
			self.assertNotIn(row.stock_no, seen, f"Duplicate stock_no {row.stock_no}")
			seen.add(row.stock_no)
		self.assertEqual(len(seen), _STRESS_VIN_COUNT)

	def test_stress_auto_reserve_from_settings_many_vehicles(self):
		frappe.db.set_single_value("Vehicle Stock Settings", "automatically_reserve_stock", 1)
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		self._receive(doc, _STRESS_VINS)
		for vin in _STRESS_VINS:
			self.assertTrue(
				frappe.db.exists("Reserved Vehicles", {"vin_serial_no": vin}),
				f"Reserved Vehicles missing for {vin}",
			)
			status = frappe.db.get_value("Vehicle Stock", vin, "availability_status")
			self.assertEqual(status, "Reserved", f"Vehicle Stock {vin} not Reserved")
		self.assertEqual(
			frappe.db.count("Reserved Vehicles", {"vin_serial_no": ["in", list(_STRESS_VINS)]}),
			_STRESS_VIN_COUNT,
		)

	def test_stress_all_already_received_large_batch_no_stock_entry_call(self):
		for vin in _STRESS_VINS:
			frappe.db.sql(
				"INSERT IGNORE INTO `tabVehicle Stock` (name, vin_serial_no, creation, modified, owner, modified_by) "
				"VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator')",
				(vin, vin),
			)
		items = [_item(vin) for vin in _STRESS_VINS]
		doc = self._make_shipment(items=items)
		target = (
			"edp_online_vehicles.edp_online_vehicles.doctype"
			".vehicles_shipment.vehicles_shipment"
			".VehiclesShipment.create_stock_entry_for_serial_numbers"
		)
		with patch(target) as mock_se:
			result = doc.create_stock_entry(frappe.as_json(items))
		self.assertEqual(result, "Received")
		mock_se.assert_not_called()
