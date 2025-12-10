#!/usr/bin/env python3
"""
Fix HQ Part Order Creation Issue

This script fixes the issue where dealers cannot create HQ Part Orders:
1. Grants Create permission on HQ Part Order to Dealer Vehicle Administrator
2. Fixes the autoname issue - changes from "field:part_order" to a format-based naming
   that works when part_order is not set initially

Run this script on the live environment:
    
    Option 1 (bench console - Recommended):
        bench --site <site_name> console
        Then: from edp_online_vehicles.events.fix_hq_part_order_creation import fix_hq_part_order_creation
              fix_hq_part_order_creation()
    
    Option 2 (bench execute):
        bench --site <site_name> execute edp_online_vehicles.events.fix_hq_part_order_creation.fix_hq_part_order_creation
"""

import frappe


def fix_hq_part_order_creation():
    """Fix HQ Part Order creation issues for dealers"""
    
    print("=" * 80)
    print("FIXING HQ PART ORDER CREATION ISSUES")
    print("=" * 80)
    
    # Fix 1: Grant Create permission on HQ Part Order to Dealer Vehicle Administrator
    print("\n[1/2] Fixing HQ Part Order Create permission...")
    fix_hq_part_order_create_permission()
    
    # Fix 2: Fix autoname to work when part_order is not set
    print("\n[2/2] Fixing HQ Part Order autoname...")
    fix_hq_part_order_autoname()
    
    print("\n" + "=" * 80)
    print("FIXES COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print("\nNote: HQ Part Orders can now be created manually by dealers.")
    print("      The part_order field will be auto-set to match the document name.")


def fix_hq_part_order_create_permission():
    """Grant Create permission on HQ Part Order to Dealer Vehicle Administrator"""
    
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
            if not custom_perm.create:
                custom_perm.create = 1
                updated = True
            
            if updated:
                custom_perm.save(ignore_permissions=True)
                print(f"   ✓ Updated existing permission: {role} can now CREATE {doctype}")
            else:
                print(f"   ✓ Permission already exists: {role} can CREATE {doctype}")
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
                "create": 1,  # Allow dealers to create HQ Part Orders
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
            print(f"   ✓ Created new permission: {role} can now CREATE {doctype}")
        
        frappe.db.commit()
    except Exception as e:
        print(f"   ✗ ERROR: Failed to fix HQ Part Order Create permission: {str(e)}")
        frappe.db.rollback()
        raise


def fix_hq_part_order_autoname():
    """Fix HQ Part Order autoname to work when part_order is not set"""
    
    try:
        # Get the HQ Part Order DocType
        dt = frappe.get_doc("DocType", "HQ Part Order")
        
        # Check current autoname
        current_autoname = dt.autoname
        print(f"   ℹ Current autoname: {current_autoname}")
        
        if current_autoname == "field:part_order":
            # Change to format-based naming (similar to Part Order)
            # Use format: HQ-PO-{MM}{YY}-{######}
            dt.autoname = "format:HQ-PO-{MM}{YY}-{######}"
            dt.save(ignore_permissions=True)
            frappe.db.commit()
            print(f"   ✓ Changed autoname from 'field:part_order' to 'format:HQ-PO-{{MM}}{{YY}}-{{######}}'")
        else:
            print(f"   ✓ Autoname already set to: {current_autoname}")
        
        # Now add logic to auto-set part_order field if not set
        # We'll add this to the Python class
        add_autoname_logic_to_python_class()
        
    except Exception as e:
        print(f"   ✗ ERROR: Failed to fix HQ Part Order autoname: {str(e)}")
        frappe.db.rollback()
        raise


def add_autoname_logic_to_python_class():
    """Add autoname logic to HQ Part Order Python class to set part_order if not set"""
    
    try:
        python_file_path = "edp_online_vehicles/edp_online_vehicles/doctype/hq_part_order/hq_part_order.py"
        full_path = frappe.get_app_path("edp_online_vehicles", python_file_path)
        
        # Read the current file
        with open(full_path, 'r') as f:
            lines = f.readlines()
        
        # Check if before_insert already sets part_order
        has_part_order_logic = False
        in_before_insert = False
        for i, line in enumerate(lines):
            if "def before_insert(self):" in line:
                in_before_insert = True
            elif in_before_insert and ("def " in line or line.strip() == "" and i < len(lines) - 1 and lines[i+1].startswith("\tdef ")):
                in_before_insert = False
            elif in_before_insert and "self.part_order" in line:
                has_part_order_logic = True
                break
        
        if has_part_order_logic:
            print(f"   ✓ before_insert already sets part_order")
            return
        
        # Find where to add the logic
        before_insert_idx = -1
        for i, line in enumerate(lines):
            if "def before_insert(self):" in line:
                before_insert_idx = i
                break
        
        if before_insert_idx != -1:
            # Find the end of the method (next def or end of class)
            method_end = before_insert_idx + 1
            for i in range(before_insert_idx + 1, len(lines)):
                if lines[i].startswith("\tdef ") and i > before_insert_idx + 1:
                    method_end = i
                    break
                if i == len(lines) - 1:
                    method_end = len(lines)
            
            # Add the logic before the method ends (before the last line)
            indent = "\t\t"
            new_lines = [
                f"{indent}# Set part_order to name if not already set (for manual creation)\n",
                f"{indent}if not self.part_order and self.name:\n",
                f"{indent}\tself.part_order = self.name\n"
            ]
            # Insert before the last line of the method
            lines[method_end:method_end] = new_lines
        else:
            # Add before_insert method after validate
            validate_idx = -1
            for i, line in enumerate(lines):
                if "def validate(self):" in line:
                    validate_idx = i
                    break
            
            if validate_idx != -1:
                # Find end of validate method
                method_end = validate_idx + 1
                for i in range(validate_idx + 1, len(lines)):
                    if lines[i].startswith("\tdef ") and i > validate_idx + 1:
                        method_end = i
                        break
                    if i == len(lines) - 1:
                        method_end = len(lines)
                
                # Insert new method
                new_method = [
                    "\n",
                    "\tdef before_insert(self):\n",
                    "\t\t# Set part_order to name if not already set (for manual creation)\n",
                    "\t\tif not self.part_order and self.name:\n",
                    "\t\t\tself.part_order = self.name\n",
                    "\n"
                ]
                lines[method_end:method_end] = new_method
            else:
                # Add at the end of class methods
                class_end = len(lines)
                for i in range(len(lines) - 1, -1, -1):
                    if lines[i].strip().startswith("def "):
                        class_end = i + 1
                        # Find end of this method
                        for j in range(i + 1, len(lines)):
                            if lines[j].startswith("\tdef ") or (lines[j].strip() == "" and j < len(lines) - 1 and lines[j+1].startswith("\tdef ")):
                                class_end = j
                                break
                        break
                
                new_method = [
                    "\n",
                    "\tdef before_insert(self):\n",
                    "\t\t# Set part_order to name if not already set (for manual creation)\n",
                    "\t\tif not self.part_order and self.name:\n",
                    "\t\t\tself.part_order = self.name\n"
                ]
                lines[class_end:class_end] = new_method
        
        # Write the updated content
        with open(full_path, 'w') as f:
            f.writelines(lines)
        
        print(f"   ✓ Added/updated before_insert to set part_order field")
        print(f"   ℹ Note: You may need to restart bench for Python changes to take effect")
        
    except Exception as e:
        print(f"   ⚠ WARNING: Could not update Python class: {str(e)}")
        print(f"   ℹ Manual step required: Add to hq_part_order.py before_insert method:")
        print(f"      if not self.part_order and self.name:")
        print(f"          self.part_order = self.name")


if __name__ == "__main__":
    # Allow running directly
    frappe.connect()
    fix_hq_part_order_creation()

