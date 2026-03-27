import frappe
import json
import pandas as pd
from pathlib import Path

'''
    bench --site [site] edp_online_vehicles.edp_online_vehicles.edp_online_vehicles.public.python.user_import.create_users_procedure
    bench --site [site] edp_online_vehicles.public.python.user_import.send_welcome_email_procedure
'''

def create_users_procedure():
    FILENAME = "User Create"
    directory = Path(frappe.get_app_path("edp_online_vehicles"), "public", "Import Files")

    print(f"#|Searching in Directory for 'User Create' files")

    files = list(directory.glob(f"{FILENAME}.*"))

    for file in files:
        print(f"#|Starting processing of file")
        if file.suffix.lower() in [".xlsx",".xls"]:
            print(f"#|{file.name} found: Excel")
            print(f"#|Extracting user data")
            user_list = extract_user_data_from_excel(file)
            print(f"#|Extraction complete")
            created_users, rejected_users, duplicate_users = create_users_in_db(user_list)
            if rejected_users:
                # create output excel
                print(f"#|Please see directory for file containing rejected users")
            if duplicate_users:
                # create output excel
                print(f"#|Please see directory for file containing duplicate users")
            if created_users:
                print(f"#|Users have been created")
            print(f"#|Ending processing of file")
            print(f"#|Deleting file")
            file.unlink()
            print(f"#|Deleted file")
    print(f"#|All files have been processed")
        
def send_welcome_email_procedure():
    FILENAME = "User Send Email"
    directory = Path(frappe.get_app_path("edp_online_vehicles"), "public", "Import Files")

    print(f"#|Searching in Directory for 'User Send Email' files")

    files = list(directory.glob(f"{FILENAME}.*"))

    for file in files:
        print(f"#|Starting processing of file")
        if file.suffix.lower() in [".xlsx",".xls"]:
            print(f"#|{file.name} found: Excel")
            print(f"#|Extracting user data")
            user_list = extract_user_data_from_excel(file)
            print(f"#|Extraction complete")
            
            for user in user_list:
                send_welcome_email(user.get("Email").strip().lower())

            print(f"#|Ending processing of file")
            print(f"#|Deleting file")
    print(f"#|All files have been processed")

def extract_user_data_from_excel(file = None):
    df = pd.read_excel(file)
    df.columns = df.columns.str.strip()
    df = df.where(pd.notnull(df), None)
    data = df.to_dict(orient="records")
    return data

def send_welcome_email(email = ""):
    print(f"#|Validating if user exists {email}")
    if frappe.db.exists({"doctype":"Users", "email":email}) and email != "":
        print(f"#|User exists {email}")
        user = frappe.get_doc("User", email)
        print(f"#|Sending welcome email to user: {email}")
        user.send_welcome_mail()
    else:
        print(f"#|User does not exist: {email}")

def create_users_in_db(user_list):
    duplicate_user_entries = []
    faulty_user_entries = []
    created_user_entries = []

    print(f"#|Checking if list has data")
    if user_list:
        print(f"#|Check passed as list has data")
        print(f"#|Starting processing of user data")
        for user in user_list:
            print(f"#|Processing record: {user}")
            email = user.get("Email", None)
            username = user.get("Username", None) 
            firstname = user.get("First Name", None) 
            lastname = user.get("Last Name", None) 
            enabled = user.get("Enabled", None) 
            send_welcome_email = user.get("Send Welcome Email", None) 
            company = user.get("Company", None) 
            allow = user.get("Allow", None) 
            for_value = user.get("For Value", None) 
            apply_to_all_document_types = user.get("Apply To All Document Types", None)

            print(f"#|Validating user data")
            if (
                (not isinstance(email, str) or not email)
                or (not isinstance(username, str) or not username)
                or (not isinstance(firstname, str) or not firstname)
                or (not isinstance(lastname, str) or not lastname)
                or (not isinstance(enabled, int) or enabled not in [0,1])
                or (not isinstance(send_welcome_email, int) or send_welcome_email not in [0,1])
                or (not isinstance(company, str) or not company)
                or (not isinstance(allow, str) or not allow)
                or (not isinstance(for_value, str) or not for_value)
                or (not isinstance(apply_to_all_document_types, int) or apply_to_all_document_types not in [0,1])
            ):
                print(f"#|Invalid user data")
                faulty_user_entries.append(user)
                continue
            
            elif frappe.db.exists("User", {"email": email.strip().lower()}):
                print(f"#|Duplicate user data")
                duplicate_user_entries.append(user)
                continue
            
            else:
                print(f"#|Validation passed")
                print(f"#|Creating new user")
                new_user = frappe.new_doc("User")
                new_user.email = email.strip().lower()
                new_user.username = username
                new_user.first_name = firstname
                new_user.last_name = lastname
                new_user.enabled = enabled
                new_user.send_welcome_email = send_welcome_email
                new_user.insert()
                print(f"#|Created user")

                print(f"#|Creating user permission")
                new_user_permission = frappe.new_doc("User Permission")
                new_user_permission.user = email.strip().lower()
                new_user_permission.allow = allow
                new_user_permission.for_value = for_value
                new_user_permission.apply_to_all_doctypes = apply_to_all_document_types
                new_user_permission.insert()
                print(f"#|Created user permission")

                created_user_entries.append(user)
                continue
    else:
        print(f"#|List has no data")
        return created_user_entries, faulty_user_entries, duplicate_user_entries
    print(f"#|User data processing complete")
    return created_user_entries, faulty_user_entries, duplicate_user_entries
