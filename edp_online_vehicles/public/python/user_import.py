import frappe
import json
import pandas

def create_user_procedure()
    #TODO add read from JSON functionality
    #TODO EXCEL
    user_list = extract_user_data_from_excel_as_list()

    email_sent = send_welcome_email(email)

    if email_sent:
        print(f"Welcome email sent to {email}")
    else:
        print(f"Welcome email not sent to {email}")

def extract_user_data_from_excel_as_list(path, filetype = '.xls')
    '''
    This function returns a list of users (dictionaries)
    '''
    pass

def send_welcome_email(email = "", execute = True)
    '''
    This is a function that will send a welcome email to a user ONLY if the user exists.
    It will return boolean.

    It has a built-in execute check.

    Return code: True => User exists and welcome email could be sent
    Return code: False => User does not exist or welcome email could be sent

    Parameters: 
    email => str
    execute => bool
    '''

    if execute:
        if not frappe.db.exists({"doctype":"Users", "email":email}) and email != "":
            user = frappe.get_doc("User", email)
            user.send_welcome_mail()
            return True
        else:
            return False
    else:
        return False

def create_user_in_db()
    pass
