import frappe
from frappe.core.doctype.communication.email import make

@frappe.whitelist()
def send_custom_email(users,subject,message,doctype,doc_name):
    frappe.sendmail(
        recipients=users, 
        subject=subject,
        message=message,
        reference_doctype=doctype,
        reference_name=doc_name
    )

@frappe.whitelist()
def send_custom_email_from_template(users, template_name, context, doctype, doc_name):

    template = frappe.get_doc("Email Template", template_name)

    subject = frappe.render_template(template.subject, context)
    message = frappe.render_template(template.response or "", context)

    if not message and getattr(template, "response_html", None):
        message = frappe.render_template(template.response_html, context)

    send_custom_email(users, subject, message, doctype, doc_name)

# @frappe.whitelist()
# def send_hq_order_email(status,dealer, doc_name, model, colour, description, price, vin, ordered_by, transport_company = None):

#     status_doc = frappe.get_doc('Vehicles Order Status', status)
#     company_doc = frappe.get_doc('Company', dealer)
#     users = [row.user for row in status_doc.send_email_to_users]

#     user_changed = frappe.get_doc("User", frappe.session.user)

#     # users.append(user_changed)

#     user = frappe.get_value('User', {"first_name":ordered_by}, 'email')
#     if user:
#         users.append(user)

#     if status_doc.send_mail_to_regional_manager:
#         custom_regional_sales_manager = company_doc.custom_regional_sales_manager
#         users.append(custom_regional_sales_manager)

#     if status_doc.send_mail_to_sales_coordinator:
#         custom_sales_coordinator = company_doc.custom_sales_coordinator
#         users.append(custom_sales_coordinator)

#     if status_doc.send_mail_to_transport_company and transport_company:
#         transport_company_email = frappe.get_value('Transporters', transport_company, 'email_adrress')
#         users.append(transport_company_email)

#     if status_doc.send_mail_to_floorplan:
#         for floorplan in company_doc.custom_floorplan_options:
#             users.append(floorplan.email)

#     if status_doc.email_template :
#         template = frappe.get_doc("Email Template", status_doc.email_template)
    
#         price = f"R {float(price):,.2f}" if price else "R 0.00"

#         context = {
#             "order_no": doc_name,
#             "model": model,
#             "colour": colour,
#             "description": description,
#             "price": price,
#             "vin": vin,
#             "timeframe": status_doc.cancel_order_after_hours
#         }

#         subject = frappe.render_template(template.subject, context)
#         message = frappe.render_template(template.response_html, context)

#         if users:
#             send_custom_email(users,subject,message,"Head Office Vehicle Orders",doc_name)
    
@frappe.whitelist()
def send_failed_integration_email(hq_order_doc,action):

    users = hq_order_doc.owner


    template = frappe.get_doc("Email Template", 'Failed Integration')
    
    price = f"R {float(hq_order_doc.invoice_amount):,.2f}" if hq_order_doc.invoice_amount else "R 0.00" ###get price including

    context = {
        "order_no": hq_order_doc.name,
        "model": hq_order_doc.model_delivered,
        "colour": hq_order_doc.colour_delivered,
        "description": hq_order_doc.model_description,
        "price": price,
        "vin": hq_order_doc.vinserial_no,
        "action": action
    }

    subject = frappe.render_template(template.subject, context)
    message = frappe.render_template(template.response_html, context)

    send_custom_email(users,subject,message,"Head Office Vehicle Orders",doc_name)
