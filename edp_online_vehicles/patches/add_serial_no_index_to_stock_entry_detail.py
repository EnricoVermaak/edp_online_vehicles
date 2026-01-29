import frappe


def execute():

# Hierdie patch is baie belangrik.
# Dis n probleem gewees by mahindra waar vehicle allocation op n order baie lank gevat het.
# Die sit n index in die db, wat dit baie vinniger maak.

    print("=" * 80)
    print("Adding index on serial_no column in Stock Entry Detail")
    print("=" * 80)
    
    try:
        existing_indexes = frappe.db.sql("""
            SHOW INDEX FROM `tabStock Entry Detail` 
            WHERE Column_name = 'serial_no'
        """, as_dict=True)
        
        if existing_indexes:
            print(f"  [SKIP] Index on serial_no already exists: {existing_indexes[0].get('Key_name')}")
            return
        
        print("  [CREATE] Creating index 'serial_no_index' on tabStock Entry Detail.serial_no...")
        frappe.db.sql("""
            CREATE INDEX serial_no_index 
            ON `tabStock Entry Detail`(serial_no)
        """)
        
        frappe.db.commit()
        print("  [SUCCESS] Index created successfully")
        
        print("\n  Verifying index...")
        verify_result = frappe.db.sql("""
            SHOW INDEX FROM `tabStock Entry Detail` 
            WHERE Key_name = 'serial_no_index'
        """, as_dict=True)
        
        if verify_result:
            print(f"  [VERIFIED] Index 'serial_no_index' is active")
            print(f"              Cardinality: {verify_result[0].get('Cardinality')}")
        
    except Exception as e:
        error_msg = f"Failed to create index on serial_no: {str(e)}"
        print(f"  [ERROR] {error_msg}")
        frappe.log_error(error_msg, "Stock Entry Detail Index Patch")
        # Don't raise the error - let migration continue
    
    print("\n" + "=" * 80)
    print("Stock Entry Detail Index Patch Complete!")
    print("=" * 80)
