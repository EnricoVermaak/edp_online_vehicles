import frappe

def execute():
    # Get all workspace links that link to the tac-integration-dashboard
    frappe.get_all("Workspace Link", filters={"link_to": "tac-integration-dashboard"})

    # Display all workspace links that link to the tac-integration-dashboard
    links = frappe.get_all("Workspace Link", filters={"link_to": "tac-integration-dashboard"})
    for link in links:
        print(link.name)

    # Delete all workspace links that link to the tac-integration-dashboard
    for link in links:
        frappe.delete_doc("Workspace Link", link.name)