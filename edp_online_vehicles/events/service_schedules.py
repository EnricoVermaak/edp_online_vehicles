import frappe
import json
from frappe import _


@frappe.whitelist()
def bulk_sync_by_interval(source_names):
    if isinstance(source_names, str):
        source_names = json.loads(source_names)

    results = {"updated_count": 0, "created_count": 0, "errors": []}

    fields_to_sync = [
        "period_months",
        "allow_duplicate_services",
        "allow_users_to_add_edit_remove_parts",
        "allow_users_to_add_edit_remove_labour",
    ]
    child_tables = ["service_parts_items", "service_labour_items"]

    all_model_codes = frappe.get_all("Model Administration", pluck="name")

    for source_name in source_names:
        try:
            source_doc = frappe.get_doc("Service Schedules", source_name)
            interval = source_doc.interval

            if interval is None:
                results["errors"].append(f"Skipped {source_name}: Interval is empty.")
                continue

            for model_code in all_model_codes:
                if source_doc.model_code == model_code:
                    continue

                existing_name = frappe.db.get_value(
                    "Service Schedules",
                    {"model_code": model_code, "interval": interval},
                    "name",
                )

                if existing_name:
                    target_doc = frappe.get_doc("Service Schedules", existing_name)

                    for field in fields_to_sync:
                        target_doc.set(field, source_doc.get(field))

                    for table in child_tables:
                        target_doc.set(table, [])
                        source_table_data = source_doc.get(table)
                        if source_table_data:
                            for row in source_table_data:
                                target_doc.append(
                                    table, row.as_dict(no_default_fields=True)
                                )

                    target_doc.save(ignore_permissions=True)
                    results["updated_count"] += 1
                else:
                    new_doc = frappe.new_doc("Service Schedules")

                    new_doc.model_code = model_code
                    new_doc.interval = interval

                    for field in fields_to_sync:
                        new_doc.set(field, source_doc.get(field))

                    for table in child_tables:
                        source_table_data = source_doc.get(table)
                        if source_table_data:
                            for row in source_table_data:
                                new_row = row.as_dict(no_default_fields=True)
                                new_doc.append(table, new_row)

                    new_doc.insert(ignore_permissions=True)
                    results["created_count"] += 1

        except Exception as e:
            frappe.log_error(frappe.get_traceback(), _("Bulk Distribute Error"))
            results["errors"].append(f"Error processing {source_name}: {str(e)}")
            continue

    frappe.db.commit()
    return results


@frappe.whitelist()
def copy_to_target_model(source_names, target_model):
    if isinstance(source_names, str):
        source_names = json.loads(source_names)

    results = {"updated_count": 0, "created_count": 0, "errors": []}

    child_tables = ["service_parts_items", "service_labour_items"]

    for source_name in source_names:
        try:
            source_doc = frappe.get_doc("Service Schedules", source_name)
            interval = source_doc.interval

            if interval is None:
                results["errors"].append(f"Skipped {source_name}: Interval is empty.")
                continue

            if source_doc.model_code == target_model:
                results["errors"].append(f"Skipped {source_name}: Source and target model are the same.")
                continue

            existing_name = frappe.db.get_value(
                "Service Schedules",
                {"model_code": target_model, "interval": interval},
                "name",
            )

            if existing_name:
                target_doc = frappe.get_doc("Service Schedules", existing_name)

                for table in child_tables:
                    target_doc.set(table, [])
                    source_table_data = source_doc.get(table)
                    if source_table_data:
                        for row in source_table_data:
                            target_doc.append(
                                table, row.as_dict(no_default_fields=True)
                            )

                target_doc.save(ignore_permissions=True)
                results["updated_count"] += 1
            else:
                new_doc = frappe.new_doc("Service Schedules")

                new_doc.model_code = target_model
                new_doc.interval = source_doc.interval
                new_doc.period_months = source_doc.period_months
                new_doc.allow_duplicate_services = source_doc.allow_duplicate_services
                new_doc.allow_users_to_add_edit_remove_parts = source_doc.allow_users_to_add_edit_remove_parts
                new_doc.allow_users_to_add_edit_remove_labour = source_doc.allow_users_to_add_edit_remove_labour

                for table in child_tables:
                    source_table_data = source_doc.get(table)
                    if source_table_data:
                        for row in source_table_data:
                            new_row = row.as_dict(no_default_fields=True)
                            new_doc.append(table, new_row)

                new_doc.insert(ignore_permissions=True)
                results["created_count"] += 1

        except Exception as e:
            frappe.log_error(frappe.get_traceback(), _("Copy to Target Model Error"))
            results["errors"].append(f"Error processing {source_name}: {str(e)}")
            continue

    frappe.db.commit()
    return results


@frappe.whitelist()
def get_all_model(model):
    models = frappe.get_all(
        "Vehicle Service Booking",
        filters={"model": model,"status":"Pending"},
        pluck="name",
        order_by="creation desc",
        limit_page_length=1,
    )
    return models
