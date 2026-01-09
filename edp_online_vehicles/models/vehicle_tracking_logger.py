import frappe
import json
from typing import Optional, Any, Dict


class VehicleTrackingLogger:
    """
    Utility class for logging to Vehicle Tracking doctype.
    
    Methods:
        log() - Main method to create a Vehicle Tracking entry with all fields
        log_api_call() - Convenience method for logging API calls (type=Integration)
        log_success() - Convenience method for logging successful operations (status=Successful)
        log_error() - Convenience method for logging errors (status=Error, includes error_message)
        log_failed() - Convenience method for logging failed operations (status=Failed)
        update() - Update an existing Vehicle Tracking document with response data
        _format_as_json() - Helper: Format value as JSON or return string as-is
        _truncate_summary() - Helper: Truncate action summary to 140 chars max
        _ensure_integration_endpoint() - Helper: Auto-create integration endpoint if missing
    """
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
        """
        Main logging method that creates a Vehicle Tracking entry.
        
        Args:
            action_summary: Brief description of the action (required, max 140 chars)
            vin_serial_no: VIN/Serial number (Link to Vehicle Stock)
            request_payload: Request data (will be JSON formatted or kept as string)
            response: Response data (will be JSON formatted or kept as string)
            status: Status of the operation (Pending, Processed, Successful, Failed, Error)
            type: Type of tracking entry (Integration, EDP Online)
            integration_end_point: Integration endpoint name (will be auto-created if needed)
            hq_order_no: HQ Order number (Link to Head Office Vehicle Orders)
            soap_method: SOAP method name
            floorplan: Floorplan name
            response_status: Additional response status text
            request_datetime: Custom request datetime (defaults to now)
            response_datetime: Custom response datetime (defaults to now if response provided)
            submit: Whether to submit the document after creation (defaults to False)
        
        Returns:
            The name of the created Vehicle Tracking document, or None if creation failed
        """
        try:
            # Ensure integration endpoint exists if provided
            integration_end_point = self._ensure_integration_endpoint(integration_end_point)
            
            # Set timestamps
            request_ts = request_datetime or frappe.utils.now_datetime()
            response_ts = response_datetime or (request_ts if response else None)
            
            # Format request and response as JSON
            formatted_request = self._format_as_json(request_payload)
            formatted_response = self._format_as_json(response)
            
            # Build document dictionary
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
            
            # Handle VIN/Serial number
            vin_value = None
            if vin_serial_no:
                vin_value = str(vin_serial_no).strip()
                if vin_value and frappe.db.exists("Vehicle Stock", vin_value):
                    doc_dict["vin_serial_no"] = vin_value
                elif vin_value:
                    # If VIN doesn't exist in Vehicle Stock, append it to action_summary
                    doc_dict["action_summary"] = self._truncate_summary(
                        f"[VIN:{vin_value}] {doc_dict['action_summary']}"
                    )
            
            # Add optional fields
            if hq_order_no:
                doc_dict["hq_order_no"] = hq_order_no
            if soap_method:
                doc_dict["soap_method"] = soap_method
            if floorplan:
                doc_dict["floorplan"] = floorplan
            
            # Create document
            doc = frappe.get_doc(doc_dict)
            
            # If VIN is not in doc_dict (not found in Vehicle Stock), ignore mandatory
            if "vin_serial_no" not in doc_dict:
                doc.flags.ignore_mandatory = True
            
            doc.insert(ignore_permissions=True)
            
            # Submit document if requested
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
        """
        Convenience method for logging API calls (type=Integration).
        
        Args:
            action_summary: Brief description of the API call
            vin_serial_no: VIN/Serial number
            request_payload: Request payload
            response: Response data
            status: Status of the API call
            integration_end_point: Integration endpoint name
            **kwargs: Additional fields (hq_order_no, soap_method, floorplan, etc.)
        
        Returns:
            The name of the created Vehicle Tracking document, or None if creation failed
        """
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
        """
        Convenience method for logging successful operations (status=Successful).
        
        Args:
            action_summary: Brief description of the successful operation
            vin_serial_no: VIN/Serial number
            request_payload: Request payload
            response: Response data
            integration_end_point: Integration endpoint name
            **kwargs: Additional fields (hq_order_no, soap_method, floorplan, etc.)
        
        Returns:
            The name of the created Vehicle Tracking document, or None if creation failed
        """
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
        """
        Convenience method for logging errors (status=Error).
        
        Args:
            action_summary: Brief description of the error
            vin_serial_no: VIN/Serial number
            request_payload: Request payload (if any)
            response: Response data or error details
            error_message: Error message (will be added to response if provided)
            integration_end_point: Integration endpoint name
            **kwargs: Additional fields (hq_order_no, soap_method, floorplan, etc.)
        
        Returns:
            The name of the created Vehicle Tracking document, or None if creation failed
        """
        # Combine response with error message if provided
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
        """
        Convenience method for logging failed operations (status=Failed).
        
        Args:
            action_summary: Brief description of the failed operation
            vin_serial_no: VIN/Serial number
            request_payload: Request payload
            response: Response data
            integration_end_point: Integration endpoint name
            **kwargs: Additional fields (hq_order_no, soap_method, floorplan, etc.)
        
        Returns:
            The name of the created Vehicle Tracking document, or None if creation failed
        """
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
        """
        Update an existing Vehicle Tracking document with response data.
        
        Args:
            tracking_doc_name: Name of the existing Vehicle Tracking document
            status: New status to set
            response: Response data to add/update (will be JSON formatted or kept as string for XML)
            response_status: Response status text to set
            response_datetime: Response datetime (defaults to now if response provided)
        
        Returns:
            The name of the updated Vehicle Tracking document, or None if update failed
        """
        try:
            if not frappe.db.exists("Vehicle Tracking", tracking_doc_name):
                frappe.log_error(
                    message=f"Vehicle Tracking document '{tracking_doc_name}' does not exist",
                    title="Vehicle Tracking Update Failure"
                )
                return None
            
            doc = frappe.get_doc("Vehicle Tracking", tracking_doc_name)
            
            # Update status if provided
            if status:
                doc.status = status
            
            # Update response if provided
            if response is not None:
                doc.response = self._format_as_json(response)
                if response_datetime:
                    doc.response_datetime = response_datetime
                elif not doc.response_datetime:
                    # Only set if not already set
                    doc.response_datetime = frappe.utils.now_datetime()
            
            # Update response_status if provided
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
        """
        Format value as JSON string, or return as-is if already a string (for XML/plain text).
        
        Args:
            value: Value to format (dict, list, string, XML, etc.)
        
        Returns:
            JSON formatted string (or original string for XML/plain text), or None if value is empty/None
        """
        if value in (None, ""):
            return None
        
        # If it's already a string, return as-is (could be XML or plain text)
        if isinstance(value, str):
            return value
        
        # Try to format as JSON
        try:
            return json.dumps(value, indent=2)
        except TypeError:
            try:
                return frappe.as_json(value, indent=2)
            except Exception:
                return str(value)
    
    def _truncate_summary(self, summary: str) -> str:
        """
        Truncate action summary to maximum allowed length (140 chars).
        
        Args:
            summary: Action summary string to truncate
        
        Returns:
            Truncated summary if needed
        """
        if not summary:
            return ""
        if len(summary) <= self.MAX_ACTION_SUMMARY_LENGTH:
            return summary
        return summary[:self.MAX_ACTION_SUMMARY_LENGTH]
    
    def _ensure_integration_endpoint(self, name: Optional[str]) -> Optional[str]:
        """
        Ensure integration endpoint exists, auto-create if needed.
        
        Args:
            name: Integration endpoint name
        
        Returns:
            Integration endpoint name if created/found, None otherwise
        """
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
