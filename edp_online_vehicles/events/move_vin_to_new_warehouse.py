import frappe
from datetime import datetime
from frappe.utils import today

@frappe.whitelist()
def move_vin_to_new_warehouse(docnames, to_warehouse):
    try:
        docnames = frappe.parse_json(docnames)

        for docname in docnames:
            doc = frappe.get_doc('Vehicle Stock', docname)
            
            to_warehouse_doc = frappe.get_doc('Warehouse', to_warehouse)

            model_doc = frappe.get_doc('Model Administration', doc.model)

            new_location_movement = frappe.new_doc('Vehicles Location Movement')

            new_location_movement.vinserial_no = doc.name
            new_location_movement.date_of_request = today()
            new_location_movement.reference_doctype = 'Vehicle Stock'
            new_location_movement.reference_name = doc.name
            new_location_movement.prev_warehouse = doc.target_warehouse
            new_location_movement.move_to_warehouse = to_warehouse
            new_location_movement.status = 'Approved'

            new_location_movement.insert(ignore_permissions=True)

            # # Create Material Issue Stock Entry
            # new_issue = frappe.new_doc('Stock Entry')
            # new_issue.stock_entry_type = "Material Issue"
            # new_issue.company = doc.dealer
            # new_issue.append('items', {
            #     's_warehouse': doc.target_warehouse,
            #     'item_code': doc.model,
            #     'qty': 1,
            #     'uom': "Unit",
            #     'basic_rate': model_doc.dealer_billing_excl,
            #     'use_serial_batch_fields': 1,
            #     'serial_no': doc.name,
            #     'allow_zero_valuation_rate': 1
            # })
            # new_issue.insert(ignore_permissions=True)
            # new_issue.submit()

            # # Create Material Receipt Stock Entry
            # new_receipt = frappe.new_doc('Stock Entry')
            # new_receipt.stock_entry_type = "Material Receipt"
            # new_receipt.company = to_warehouse_doc.company
            # new_receipt.append('items', {
            #     't_warehouse': to_warehouse,
            #     'item_code': doc.model,
            #     'qty': 1,
            #     'uom': "Unit",
            #     'basic_rate': model_doc.dealer_billing_excl,
            #     'use_serial_batch_fields': 1,
            #     'serial_no': doc.name,
            #     'allow_zero_valuation_rate': 1
            # })
            # new_receipt.insert(ignore_permissions=True)
            # new_receipt.submit()

            # # Update Equipment Stock document
            # doc.dealer = to_warehouse_doc.company
            # doc.target_warehouse = to_warehouse		
            # doc.availability_status = "Available"
            # doc.save(ignore_permissions=True)

            # now = datetime.now()
            # user = frappe.get_value('User', frappe.session.user, 'full_name')

            # new_tracking_doc = frappe.new_doc("Vehicle Tracking")
            # tracking_date_time = now.strftime("%Y-%m-%d %H:%M:%S")
            # new_tracking_doc.vin_serial_no = doc.name
            # new_tracking_doc.action_summary = "Vehicle moved to New Warehouse"
            # new_tracking_doc.request_datetime = tracking_date_time
            # new_tracking_doc.request = f"VIN/Serial No {doc.name} has been moved to Warehouse {to_warehouse} by user {user}"
            
            # new_tracking_doc.insert(ignore_permissions=True)

        return "Success"
    except Exception as e:
        frappe.msgprint(f"An error occurred: {str(e)}")