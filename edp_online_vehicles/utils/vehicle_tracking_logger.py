import frappe
import json
from typing import Optional, Any, Dict


class VehicleTrackingLogger:
    """Utility class for logging to Vehicle Tracking doctype."""
    STATUS_PENDING = "Pending"
    STATUS_PROCESSED = "Processed"
    STATUS_SUCCESSFUL = "Successful"
    STATUS_FAILED = "Failed"
    STATUS_ERROR = "Error"
    
    TYPE_INTEGRATION = "Integration"
    
    MAX_ACTION_SUMMARY_LENGTH = 140
    
    def __init__(self):
        pass
    
    def log(
        self,
        action_summary: str,
        vin_serial_no: Optional[str] = None,
        request_payload: Optional[Any] = None,
        response: Optional[Any] = None,
        status: str = STATUS_PENDING,
        type: str = TYPE_INTEGRATION,
        integration_end_point: Optional[str] = None,
        hq_order_no: Optional[str] = None,
        soap_method: Optional[str] = None,
        floorplan: Optional[str] = None,
        response_status: Optional[str] = None,
        request_datetime: Optional[Any] = None,
        response_datetime: Optional[Any] = None,
        submit: bool = False,
    ) -> Optional[str]:
        """Create a Vehicle Tracking entry.
        
        Returns the document name, or None if creation failed.
        """
        try:
            integration_end_point = self._ensure_integration_endpoint(integration_end_point)
            
            request_ts = request_datetime or frappe.utils.now_datetime()
            response_ts = response_datetime or (request_ts if response else None)
            
            formatted_request = self._format_as_json(request_payload)
            formatted_response = self._format_as_json(response)
            doc_dict = {
                "doctype": "Vehicle Tracking",
                "action_summary": self._truncate_summary(action_summary),
                "status": status or self.STATUS_PENDING,
                "type": type or self.TYPE_INTEGRATION,
                "integration_end_point": integration_end_point,
                "request_datetime": request_ts,
                "request": formatted_request,
                "response_datetime": response_ts,
                "response": formatted_response,
                "response_status": response_status or status,
            }
            
            vin_value = None
            if vin_serial_no:
                vin_value = str(vin_serial_no).strip()
                if vin_value and frappe.db.exists("Vehicle Stock", vin_value):
                    doc_dict["vin_serial_no"] = vin_value
                elif vin_value:
                    doc_dict["action_summary"] = self._truncate_summary(
                        f"[VIN:{vin_value}] {doc_dict['action_summary']}"
                    )
            
            if hq_order_no:
                doc_dict["hq_order_no"] = hq_order_no
            if soap_method:
                doc_dict["soap_method"] = soap_method
            if floorplan:
                doc_dict["floorplan"] = floorplan
            
            doc = frappe.get_doc(doc_dict)
            
            if "vin_serial_no" not in doc_dict:
                doc.flags.ignore_mandatory = True
            
            doc.insert(ignore_permissions=True)
            
            if submit:
                try:
                    doc.submit()
                except Exception as submit_error:
                    frappe.log_error(
                        message=f"Failed to submit Vehicle Tracking document {doc.name}: {str(submit_error)}",
                        title="Vehicle Tracking Submit Failure"
                    )
            
            frappe.db.commit()
            return doc.name
            
        except Exception as e:
            frappe.log_error(
                message=f"Failed to log Vehicle Tracking entry: {str(e)}\nAction Summary: {action_summary}",
                title="Vehicle Tracking Log Failure"
            )
            return None
    
    def log_api_call(
        self,
        action_summary: str,
        vin_serial_no: Optional[str] = None,
        request_payload: Optional[Any] = None,
        response: Optional[Any] = None,
        status: str = STATUS_PENDING,
        integration_end_point: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """Log API call with type=Integration."""
        return self.log(
            action_summary=action_summary,
            vin_serial_no=vin_serial_no,
            request_payload=request_payload,
            response=response,
            status=status,
            type=self.TYPE_INTEGRATION,
            integration_end_point=integration_end_point,
            **kwargs
        )
    
    def log_success(
        self,
        action_summary: str,
        vin_serial_no: Optional[str] = None,
        request_payload: Optional[Any] = None,
        response: Optional[Any] = None,
        integration_end_point: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """Log successful operation with status=Successful."""
        return self.log(
            action_summary=action_summary,
            vin_serial_no=vin_serial_no,
            request_payload=request_payload,
            response=response,
            status=self.STATUS_SUCCESSFUL,
            integration_end_point=integration_end_point,
            **kwargs
        )
    
    def log_error(
        self,
        action_summary: str,
        vin_serial_no: Optional[str] = None,
        request_payload: Optional[Any] = None,
        response: Optional[Any] = None,
        error_message: Optional[str] = None,
        integration_end_point: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """Log error with status=Error. Error message is merged into response if provided."""
        final_response = response
        if error_message:
            if final_response:
                if isinstance(final_response, dict):
                    final_response["error"] = error_message
                elif isinstance(final_response, str):
                    final_response = f"{final_response}\nError: {error_message}"
                else:
                    final_response = {"response": final_response, "error": error_message}
            else:
                final_response = error_message
        
        return self.log(
            action_summary=action_summary,
            vin_serial_no=vin_serial_no,
            request_payload=request_payload,
            response=final_response,
            status=self.STATUS_ERROR,
            integration_end_point=integration_end_point,
            **kwargs
        )
    
    def log_failed(
        self,
        action_summary: str,
        vin_serial_no: Optional[str] = None,
        request_payload: Optional[Any] = None,
        response: Optional[Any] = None,
        integration_end_point: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """Log failed operation with status=Failed."""
        return self.log(
            action_summary=action_summary,
            vin_serial_no=vin_serial_no,
            request_payload=request_payload,
            response=response,
            status=self.STATUS_FAILED,
            integration_end_point=integration_end_point,
            **kwargs
        )
    
    def update(
        self,
        tracking_doc_name: str,
        status: Optional[str] = None,
        response: Optional[Any] = None,
        response_status: Optional[str] = None,
        response_datetime: Optional[Any] = None,
    ) -> Optional[str]:
        """Update an existing Vehicle Tracking document.
        
        Returns the document name, or None if update failed.
        """
        try:
            if not frappe.db.exists("Vehicle Tracking", tracking_doc_name):
                frappe.log_error(
                    message=f"Vehicle Tracking document '{tracking_doc_name}' does not exist",
                    title="Vehicle Tracking Update Failure"
                )
                return None
            
            doc = frappe.get_doc("Vehicle Tracking", tracking_doc_name)
            
            if status:
                doc.status = status
            
            if response is not None:
                doc.response = self._format_as_json(response)
                if response_datetime:
                    doc.response_datetime = response_datetime
                elif not doc.response_datetime:
                    doc.response_datetime = frappe.utils.now_datetime()
            
            if response_status:
                doc.response_status = response_status
            
            doc.save(ignore_permissions=True)
            frappe.db.commit()
            return doc.name
            
        except Exception as e:
            frappe.log_error(
                message=f"Failed to update Vehicle Tracking entry '{tracking_doc_name}': {str(e)}",
                title="Vehicle Tracking Update Failure"
            )
            return None
    
    def _format_as_json(self, value: Any) -> Optional[str]:
        """Format value as JSON string, or return as-is if already a string."""
        if value in (None, ""):
            return None
        
        if isinstance(value, str):
            return value
        
        try:
            return json.dumps(value, indent=2)
        except TypeError:
            try:
                return frappe.as_json(value, indent=2)
            except Exception:
                return str(value)
    
    def _truncate_summary(self, summary: str) -> str:
        """Truncate action summary to 140 chars."""
        if not summary:
            return ""
        if len(summary) <= self.MAX_ACTION_SUMMARY_LENGTH:
            return summary
        return summary[:self.MAX_ACTION_SUMMARY_LENGTH]
    
    def _ensure_integration_endpoint(self, name: Optional[str]) -> Optional[str]:
        """Ensure integration endpoint exists, auto-create if missing."""
        if not name:
            return None
        
        endpoint = str(name).strip()
        if not endpoint:
            return None
        
        if frappe.db.exists("Integration End Point", endpoint):
            return endpoint
        
        try:
            doc = frappe.get_doc({
                "doctype": "Integration End Point",
                "integration_end_point": endpoint,
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            return doc.name
        except Exception as e:
            frappe.log_error(
                message=f"Failed to ensure Integration End Point '{endpoint}': {str(e)}",
                title="Integration End Point Creation Failure"
            )
            return None
