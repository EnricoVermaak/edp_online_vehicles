import frappe
import json
import os
import shutil

DOCTYPE_LIST = ["Vehicle Stock Settings", "Website Settings", "System Settings", "Global Defaults", "Navbar Settings", "Vehicles Order Status", "Email Domain", "Email Account", "Vehicle Sale Status", "Vehicle Service Settings", "Parts Settings", "Document Sharing Settings", "Vehicles Warranty Settings"]
EXCLUDE_APPS = ["frappe","erpnext","hrms","payments","edp_online_vehicles","edp_api"]
IGNORE_FIELD_TYPES = ["Section Break", "Column Break", "Tab Break", "Button", "Table", "Password"]  
ATTACHMENTS = []


@frappe.whitelist()
def import_settings(doctype_list=DOCTYPE_LIST):
    
    apps = frappe.get_installed_apps()
    for app in apps:
        if app not in EXCLUDE_APPS:
            app_path = frappe.get_app_path(app)
            folder_path = os.path.join(app_path, "edp_online_vehicles_settings")
           
    
    if not os.path.isdir(folder_path):
        frappe.throw(f"Settings folder not found in app: {app}")
    
    doctype_list = frappe.parse_json(doctype_list) if isinstance(doctype_list, str) else doctype_list
    ATTACHMENTS = []

    for doctype in doctype_list:
        if not frappe.db.exists("DocType", doctype):
            frappe.log_error(f"DocType {doctype} does not exist. Skipping import.")
            continue

        settings_meta_doc = frappe.get_doc("DocType", doctype)
        
        if settings_meta_doc.issingle:
            
            settings_doc = frappe.get_single(doctype)
            
            fields = []
            output = {}
            
            for df in settings_meta_doc.fields:
               
                if df.fieldtype not in IGNORE_FIELD_TYPES: 
                    fields.append({
                        "name": df.fieldname,
                        "type": df.fieldtype,
                        "value": settings_doc.get(df.fieldname)
                    })
                
                    if df.fieldtype == "Attach Image":
                        ATTACHMENTS.append(settings_doc.get(df.fieldname))
                
                elif df.fieldtype == "Table":
                    field = {
                       "name": df.fieldname,
                        "type": df.fieldtype,     
                        "options": df.options,
                        "label": df.label,
                    }
                    fields = get_table_values(field, doctype)
                  
                elif df.fieldtype == "Password":
                    fields.append({
                        "name": df.fieldname,
                        "type": df.fieldtype,
                        "value": get_password_value(doctype, settings_doc.name, df.fieldname)
                    })
        else:
            
            settings_doc_list = frappe.get_all(doctype)
            
            fields_list = []
            output = {}
            for df in settings_meta_doc.fields:
                if df.fieldtype not in ["Section Break", "Column Break", "Tab Break", "Button"] : 
                    fields_list.append({
                        "name": df.fieldname,
                        "type": df.fieldtype,
                        "options": df.options
                    })
                    
            # return fields
            fields = []   
            for record in settings_doc_list:
                doc = frappe.get_doc(doctype, record.name)
                
                records = []
                
                for field in fields_list:
                    if field["type"] != "Table":
                        records.append({
                            "name": field["name"],
                            "type": field["type"],
                            "value": doc.get(field["name"])
                        })

                    if field["type"] == "Attach Image":
                        ATTACHMENTS.append(doc.get(field["name"]))
                    
                    elif field["type"] == "Table":
                        records = get_table_values(field, doctype)
                        
                        
                    elif field["type"] == "Password":
                        fields.append({
                            "name": field["name"],
                            "type": field["type"],
                            "value": get_password_value(doctype, record.name, field["name"])
                        })
                
                fields.append(records)  
        
        output[doctype] = fields

        os.makedirs(folder_path, exist_ok=True)

        file_path = os.path.join(folder_path,"settings_files", f"{doctype}.json")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)
            
    get_ATTACHMENTS(ATTACHMENTS, folder_path)

    return {
        "status": "success"
    }
    
def get_ATTACHMENTS(ATTACHMENTS, folder_path):
    for file_url in ATTACHMENTS:
        if file_url:
            dest_dir = os.path.join(folder_path, "attached_files")
            os.makedirs(dest_dir, exist_ok=True)

            if file_url.startswith("/private/files/"):
                source_path = frappe.get_site_path("private", "files", os.path.basename(file_url))
            elif file_url.startswith("/files/"):
                source_path = frappe.get_site_path("public", "files", os.path.basename(file_url))
            else:
                source_path = None  
            if source_path and os.path.exists(source_path):
                dest_path = os.path.join(dest_dir, os.path.basename(source_path))
                shutil.copy2(source_path, dest_path)
    
def get_table_values(field, doctype):
    records = []
    
    table_meta_doc = frappe.get_doc("DocType", field["options"])
    table_items = []
    table_fields = []

    for df_table in table_meta_doc.fields:

        if df_table.fieldtype not in ["Section Break", "Column Break", "Tab Break", "Button", "Table"]  :
            table_items.append({"name": df_table.fieldname, "type": df_table.fieldtype})
            table_fields.append(df_table.fieldname)

    table_docs = frappe.get_all(field["options"], filters={"parenttype": doctype, "parentfield": field["name"]}, fields=table_fields)

    rows = []

    for record in table_docs:
        row = []

        for item in table_items:
            row.append({
                "name": item["name"],
                "type": item["type"],
                "value": record.get(item["name"])
        })

        if item["type"] == "Attach Image":
            ATTACHMENTS.append(record.get(item["name"]))

        rows.append(row)

    records.append({
        "name": field["name"],
        "type": field["type"],
        "value": rows
    })      
    
    return records

def get_password_value(doctype, record_name, field_name):
    try:
        frappe.utils.password.get_decrypted_password(doctype, record_name, fieldname=field_name)
    except Exception as e:
        error_msg = f"Error getting decrypted password for {doctype} - {field_name}: {str(e)}"
        frappe.log_error(error_msg[:140])