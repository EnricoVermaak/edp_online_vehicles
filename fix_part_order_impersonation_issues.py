
import frappe


def fix_issues():
    
    print("=" * 80)
    print("FIXING PART ORDER IMPERSONATION ISSUES")
    print("=" * 80)
    
    # Fix 1 & 2: Grant read permission on Item Price to Dealer Vehicle Administrator
    print("\n[1/3] Fixing Item Price read permission...")
    fix_item_price_permission()
    
    # Fix 3: Grant write permission on HQ Part Order to Dealer Vehicle Administrator
    print("\n[2/3] Fixing HQ Part Order write permission...")
    fix_hq_part_order_permission()
    
    # Summary
    print("\n[3/3] Verifying fixes...")
    verify_fixes()
    
    print("\n" + "=" * 80)
    print("FIXES COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print("\nNote: If parts screen is still empty, check that items have valid")
    print("      prices in the dealer's price list with correct date ranges.")


def fix_item_price_permission():
    """Grant read permission on Item Price to Dealer Vehicle Administrator"""
    
    role = "Dealer Vehicle Administrator"
    doctype = "Item Price"
    
    try:
        # Check if custom permission already exists
        existing = frappe.db.exists("Custom DocPerm", {
            "parent": doctype,
            "role": role
        })
        
        if existing:
            # Update existing permission
            custom_perm = frappe.get_doc("Custom DocPerm", existing)
            if not custom_perm.read:
                custom_perm.read = 1
                custom_perm.save(ignore_permissions=True)
                print(f"   ✓ Updated existing permission: {role} can now READ {doctype}")
            else:
                print(f"   ✓ Permission already exists: {role} can READ {doctype}")
        else:
            # Create new custom permission
            custom_perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1,
                "write": 0,
                "create": 0,
                "delete": 0,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 0,
                "export": 1,
                "import": 0,
                "share": 0,
                "print": 1,
                "email": 0,
                "set_user_permissions": 0
            })
            custom_perm.insert(ignore_permissions=True)
            print(f"   ✓ Created new permission: {role} can now READ {doctype}")
        
        frappe.db.commit()
    except Exception as e:
        print(f"   ✗ ERROR: Failed to fix Item Price permission: {str(e)}")
        frappe.db.rollback()
        raise


def fix_hq_part_order_permission():
    """Grant write permission on HQ Part Order to Dealer Vehicle Administrator"""
    
    role = "Dealer Vehicle Administrator"
    doctype = "HQ Part Order"
    
    try:
        # Check if custom permission already exists
        existing = frappe.db.exists("Custom DocPerm", {
            "parent": doctype,
            "role": role
        })
        
        if existing:
            # Update existing permission
            custom_perm = frappe.get_doc("Custom DocPerm", existing)
            updated = False
            if not custom_perm.read:
                custom_perm.read = 1
                updated = True
            if not custom_perm.write:
                custom_perm.write = 1
                updated = True
            
            if updated:
                custom_perm.save(ignore_permissions=True)
                print(f"   ✓ Updated existing permission: {role} can now WRITE {doctype}")
            else:
                print(f"   ✓ Permission already exists: {role} can WRITE {doctype}")
        else:
            # Create new custom permission
            custom_perm = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1,
                "write": 1,
                "create": 0,  # Dealers shouldn't create HQ Part Orders, only update status
                "delete": 0,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 0,
                "export": 1,
                "import": 0,
                "share": 0,
                "print": 1,
                "email": 0,
                "set_user_permissions": 0
            })
            custom_perm.insert(ignore_permissions=True)
            print(f"   ✓ Created new permission: {role} can now WRITE {doctype}")
        
        frappe.db.commit()
    except Exception as e:
        print(f"   ✗ ERROR: Failed to fix HQ Part Order permission: {str(e)}")
        frappe.db.rollback()
        raise


def verify_fixes():
    """Verify that the fixes were applied correctly"""
    
    role = "Dealer Vehicle Administrator"
    
    # Verify Item Price permission
    item_price_perm = frappe.db.get_value("Custom DocPerm", {
        "parent": "Item Price",
        "role": role
    }, ["read", "write"], as_dict=True)
    
    if item_price_perm and item_price_perm.read:
        print(f"   ✓ {role} can READ Item Price")
    else:
        print(f"   ✗ WARNING: {role} cannot READ Item Price")
    
    # Verify HQ Part Order permission
    hq_po_perm = frappe.db.get_value("Custom DocPerm", {
        "parent": "HQ Part Order",
        "role": role
    }, ["read", "write"], as_dict=True)
    
    if hq_po_perm and hq_po_perm.write:
        print(f"   ✓ {role} can WRITE HQ Part Order")
    else:
        print(f"   ✗ WARNING: {role} cannot WRITE HQ Part Order")


if __name__ == "__main__":
    # Allow running directly
    frappe.connect()
    fix_issues()

