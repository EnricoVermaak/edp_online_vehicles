# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class VehiclesService(Document):

    # def validate(self):
    #     self._set_system_status_from_odo_range()
    #     self._enforce_odo_range_block()

    def on_update(self):
        if not self.odo_reading_hours or self.odo_reading_hours == 0:
            self.add_tag("Odo Reading Missing")
        else:
            self.remove_tag("Odo Reading Missing")

        self.sync_to_history()
        self._sync_booking_status_from_mapping()
        setting_doc = frappe.get_doc("Vehicle Service Settings")
        setting_doc.last_job_card_no = self.job_card_no
        setting_doc.save(ignore_permissions=True)
        frappe.db.commit()

    def _sync_booking_status_from_mapping(self):
        if not self.booking_name or not self.service_status:
            return
        settings = frappe.get_single("Vehicle Service Settings")
        if not getattr(settings, "status_sync_mappings", None):
            return
        for row in settings.status_sync_mappings:
            if row.service_status == self.service_status and row.booking_status:
                frappe.db.set_value(
                    "Vehicle Service Booking",
                    self.booking_name,
                    "status",
                    row.booking_status,
                    update_modified=False,
                )
                break
        
    def sync_to_history(self):
        history_name = frappe.db.get_value(
            "Vehicle Service History",
            {"vehicles_service": self.name},
            "name"
        )

        data = self.as_dict()

        ignore_fields = {"name", "doctype", "owner", "creation",
                         "modified", "modified_by", "idx", "docstatus"}
        for field in ignore_fields:
            data.pop(field, None)
        # frappe.throw(f"{data}and {history_name}")
        if history_name:
            history_doc = frappe.get_doc("Vehicle Service History", history_name)
            history_doc.update(data)
            history_doc.save(ignore_permissions=True)
        else:
            history_doc = frappe.new_doc("Vehicle Service History")
            history_doc.vehicle_service = self.name
            history_doc.update(data)
            history_doc.vehicles_service = self.name
            history_doc.insert(ignore_permissions=True)

    def _set_system_status_from_odo_range(self):
        if not (self.odo_reading_hours and self.service_type and self.model):
            self.system_status = None
            return

        interval = frappe.db.get_value("Service Schedules", self.service_type, "interval") or 0
        model_data = frappe.db.get_value(
            "Model Administration",
            self.model,
            ["service_type_max_allowance", "service_type_minimum_allowance"],
            as_dict=True,
        ) or {}

        max_allowance = int(model_data.get("service_type_max_allowance") or 0)
        min_allowance = int(model_data.get("service_type_minimum_allowance") or 0)

        min_odo = int(interval) - min_allowance
        max_odo = int(interval) + max_allowance
        odo = int(self.odo_reading_hours or 0)

        if min_odo <= odo <= max_odo:
            self.system_status = "Conditionally Approved"
        else:
            self.system_status = "Conditionally Declined"

    def _enforce_odo_range_block(self):
        # If we don't have the data to calculate, don't block here.
        if not (self.odo_reading_hours and self.service_type and self.model):
            return

        interval = frappe.db.get_value("Service Schedules", self.service_type, "interval") or 0
        model_data = frappe.db.get_value(
            "Model Administration",
            self.model,
            ["service_type_max_allowance", "service_type_minimum_allowance"],
            as_dict=True,
        ) or {}

        max_allowance = int(model_data.get("service_type_max_allowance") or 0)
        min_allowance = int(model_data.get("service_type_minimum_allowance") or 0)

        min_odo = int(interval) - min_allowance
        max_odo = int(interval) + max_allowance
        odo = int(self.odo_reading_hours or 0)

        if odo < min_odo:
            frappe.throw(
                "Your vehicle hasn't reached its service threshold yet. "
                "Please check back when it meets the minimum mileage requirement."
            )

        if odo > max_odo:
            frappe.throw(
                "Your vehicle's mileage has exceeded the current service range. "
                "Please select the upcoming service schedule to maintain optimal performance."
            )

    def before_save(self):
        for row in self.attach_documents:
            file_url = row.document

            if file_url:
                existing_file = frappe.db.exists(
                    {
                        "doctype": "File",
                        "file_url": file_url,
                        "attached_to_doctype": self.doctype,
                        "attached_to_name": self.name,
                    }
                )
                if not existing_file:
                    file_doc = frappe.get_doc(
                        {
                            "doctype": "File",
                            "file_url": file_url,
                            "attached_to_doctype": self.doctype,
                            "attached_to_name": self.name,
                        }
                    )
                    file_doc.insert(ignore_permissions=True)
                    frappe.db.commit()
                    # frappe.msgprint(f"File {file_url} attached successfully.")

    def on_submit(self):
        history_name = frappe.db.get_value(
            "Vehicle Service History",
			{"vehicles_service": self.name, "docstatus": 0},
			"name"
		)
        if history_name:
            history_doc = frappe.get_doc("Vehicle Service History", history_name)
            history_doc.submit() 
        
        if self.vin_serial_no:
            doc = frappe.get_doc("Vehicle Stock", self.vin_serial_no)
            doc.current_hours = self.odo_reading_hours
            doc.last_service_hours = self.odo_reading_hours
            doc.last_service_date = self.service_date
            doc.add_comment("Comment", "Odo Reading updated from Service")
            doc.save(ignore_permissions=True)
            frappe.db.commit()

    def before_insert(self):
        service_docs = frappe.get_all(
            "Vehicles Service",
            filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
            fields=["name", "service_type", "odo_reading_hours", "service_status", "service_date"],
            order_by="service_date desc",
        )
        for doc in service_docs:
            self.append(
                "service_history",
                {
                    "document_no": doc.name,
                    "service_type": doc.service_type,
                    "odo_readinghours": doc.odo_reading_hours,
                    "status": doc.service_status,
                    "service_date": doc.service_date,
                },
            )

        warranty_docs = frappe.get_all(
            "Vehicles Warranty Claims",
            filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
            fields=["name", "odo_reading", "date_of_failure", "status", "summary"],
            order_by="date_of_failure desc",
        )
        for doc in warranty_docs:
            self.append(
                "warranty_history",
                {
                    "document_no": doc.name,
                    "odo_readinghours": doc.odo_reading,
                    "date_of_failure": doc.date_of_failure,
                    "status": doc.status,
                    "summary": doc.summary,
                },
            )

        breakdown_docs = frappe.get_all(
            "Vehicles Breakdown",
            filters={"model": self.model, "vin_serial_no": self.vin_serial_no},
            fields=["name", "odo_reading", "breakdown_reason", "status", "breakdown_date_time"],
            order_by="breakdown_date_time desc",
        )
        for doc in breakdown_docs:
            self.append(
                "breakdown_history",
                {
                    "document_no": doc.name,
                    "odo_readinghours": doc.odo_reading,
                    "breakdown_reason": doc.breakdown_reason,
                    "status": doc.status,
                    "breakdown_datetime": doc.breakdown_date_time,
                },
            )

        incidents_docs = frappe.get_all(
            "Vehicles Incidents",
            filters={"model_code": self.model, "vin_serial_no": self.vin_serial_no},
            fields=[
                "name",
                "location",
                "odo_reading_hours",
                "status",
                "incident_date_time",
                "incident_type",
                "incident_description",
            ],
            order_by="incident_date_time desc",
        )
        for doc in incidents_docs:
            self.append(
                "incident_history",
                {
                    "document_no": doc.name,
                    "location": doc.location,
                    "odo_readinghours": doc.odo_reading_hours,
                    "status": doc.status,
                    "incident_datetime": doc.incident_date_time,
                    "incident_type": doc.incident_type,
                    "incident_description": doc.incident_description,
                },
            )


@frappe.whitelist()
def create_internal_docs_notes(source_name, target_doc=None):
    doc = get_mapped_doc(
        "Vehicles Service",
        source_name,
        {
            "Vehicles Service": {
                "doctype": "Internal Docs and Notes",
                "field_map": {"name": "service"},
            },
        },
        target_doc,
    )

    return doc
