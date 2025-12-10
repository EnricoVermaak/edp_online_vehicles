#!/usr/bin/env python3
"""
Fix Part Order Impersonation Issues

This script fixes three issues when impersonating dealer users:
1. Parts screen empty - Permission issue with Item Price read access
2. Amount calculation failing - Permission issue with Item Price read access  
3. Status cannot be updated - Permission issue with HQ Part Order write access

Run this script on the live environment:
    
    Option 1 (bench console - Recommended):
        bench --site <site_name> console
        Then: from edp_online_vehicles.events.fix_part_order_impersonation_issues import fix_issues
              fix_issues()
    
    Option 2 (bench execute):
        bench --site <site_name> execute edp_online_vehicles.events.fix_part_order_impersonation_issues.fix_issues
"""

import frappe


def fix_issues():
    """Fix all three impersonation issues"""
    
    print("=" * 80)
    print("FIXING PART ORDER IMPERSONATION ISSUES")
    print("=" * 80)
    
    # Fix 1 & 2: Grant read permission on Item Price to Dealer Vehicle Administrator
    print("\n[1/4] Fixing Item Price read permission...")
    fix_item_price_permission()
    
    # Fix 3: Grant write permission on HQ Part Order to Dealer Vehicle Administrator
    print("\n[2/4] Fixing HQ Part Order write permission...")
    fix_hq_part_order_permission()
    
    # Fix 4: Add missing prices to Parts items
    print("\n[3/4] Adding missing prices to Parts items...")
    add_missing_prices()
    
    # Summary
    print("\n[4/4] Verifying fixes...")
    verify_fixes()
    
    print("\n" + "=" * 80)
    print("FIXES COMPLETED SUCCESSFULLY")
    print("=" * 80)


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


def add_missing_prices():
    """Add reasonable prices to Parts items that don't have valid prices in dealer price lists"""
    
    from frappe.utils import today, getdate
    from dateutil.relativedelta import relativedelta
    
    try:
        # Get all items in Parts group
        parts_items = frappe.get_all("Item", 
            filters={
                "item_group": "Parts", 
                "disabled": 0, 
                "has_variants": 0, 
                "is_sales_item": 1
            },
            fields=["name", "item_name", "standard_rate"]
        )
        
        if not parts_items:
            print("   ℹ No Parts items found")
            return
        
        # Get all dealer companies (non-HQ companies)
        hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
        dealer_companies = frappe.get_all("Company",
            filters={"name": ["!=", hq_company], "custom_active": 1},
            fields=["name", "custom_default_price_list"]
        )
        
        if not dealer_companies:
            print("   ℹ No dealer companies found")
            return
        
        current_date = today()
        prices_added = 0
        prices_updated = 0
        
        # Calculate reasonable default price from existing Parts item prices
        # Use median of Parts item prices to avoid outliers
        parts_prices = frappe.get_all("Item Price",
            filters={
                "selling": True,
                "item_code": ["in", [item.name for item in parts_items]]
            },
            fields=["price_list_rate"],
            limit=100
        )
        
        if parts_prices:
            # Filter out None/0 prices and get median
            valid_prices = sorted([p.price_list_rate for p in parts_prices if p.price_list_rate and p.price_list_rate > 0])
            if valid_prices:
                # Use median to avoid outliers
                median_idx = len(valid_prices) // 2
                median_price = valid_prices[median_idx]
                default_price = max(10.0, min(10000.0, round(median_price, 2)))  # Between R10 and R10,000
            else:
                default_price = 100.0
        else:
            default_price = 100.0  # Default fallback
        
        print(f"   ℹ Using default price: R {default_price:.2f}")
        print(f"   ℹ Processing {len(parts_items)} items across {len(dealer_companies)} dealer companies...")
        
        for company in dealer_companies:
            price_list = company.custom_default_price_list or "Standard Selling"
            
            if not frappe.db.exists("Price List", price_list):
                print(f"   ⚠ Price list '{price_list}' not found for company {company.name}, skipping")
                continue
            
            for item in parts_items:
                # Check if item has a valid price in this price list
                valid_price = frappe.get_all("Item Price",
                    fields=["name", "price_list_rate", "valid_from", "valid_upto"],
                    filters={
                        "price_list": price_list,
                        "item_code": item.name,
                        "selling": True,
                        "valid_from": ["<=", current_date],
                        "valid_upto": ["in", [None, "", current_date]],
                    },
                    limit=1
                )
                
                if valid_price:
                    continue  # Item already has valid price
                
                # Check if item has any price (even if invalid date)
                existing_price = frappe.db.get_value("Item Price", {
                    "price_list": price_list,
                    "item_code": item.name,
                    "selling": True
                })
                
                # Determine reasonable price
                # Priority: 1) Item's standard_rate, 2) Existing price rate, 3) Default price
                if item.standard_rate and item.standard_rate > 0:
                    price_rate = item.standard_rate
                elif existing_price:
                    existing_rate = frappe.db.get_value("Item Price", existing_price, "price_list_rate")
                    if existing_rate and existing_rate > 0:
                        price_rate = existing_rate
                    else:
                        price_rate = default_price
                else:
                    price_rate = default_price
                
                # Get currency from price list
                currency = frappe.db.get_value("Price List", price_list, "currency") or "ZAR"
                
                # Get item's stock UOM
                stock_uom = frappe.db.get_value("Item", item.name, "stock_uom") or "Nos"
                
                if existing_price:
                    # Update existing price to make it valid
                    price_doc = frappe.get_doc("Item Price", existing_price)
                    price_doc.price_list_rate = price_rate
                    price_doc.valid_from = getdate(current_date) - relativedelta(days=30)  # 30 days ago
                    price_doc.valid_upto = None  # No expiry
                    price_doc.save(ignore_permissions=True)
                    prices_updated += 1
                else:
                    # Create new price
                    price_doc = frappe.get_doc({
                        "doctype": "Item Price",
                        "price_list": price_list,
                        "item_code": item.name,
                        "price_list_rate": price_rate,
                        "currency": currency,
                        "uom": stock_uom,
                        "selling": True,
                        "valid_from": getdate(current_date) - relativedelta(days=30),  # 30 days ago
                        "valid_upto": None  # No expiry
                    })
                    price_doc.insert(ignore_permissions=True)
                    prices_added += 1
        
        frappe.db.commit()
        
        if prices_added > 0 or prices_updated > 0:
            print(f"   ✓ Added {prices_added} new prices")
            print(f"   ✓ Updated {prices_updated} existing prices to be valid")
        else:
            print(f"   ✓ All items already have valid prices")
            
    except Exception as e:
        print(f"   ✗ ERROR: Failed to add missing prices: {str(e)}")
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
    
    # Verify prices exist
    from frappe.utils import today
    parts_items = frappe.get_all("Item", 
        filters={"item_group": "Parts", "disabled": 0, "has_variants": 0, "is_sales_item": 1},
        fields=["name"],
        limit=10
    )
    
    if parts_items:
        # Check one dealer company's price list
        hq_company = frappe.db.get_value("Company", {"custom_head_office": 1}, "name")
        dealer_companies_list = frappe.get_all("Company",
            filters={"name": ["!=", hq_company], "custom_active": 1},
            fields=["name", "custom_default_price_list"],
            limit=1
        )
        dealer_company = dealer_companies_list[0] if dealer_companies_list else None
        
        if dealer_company and dealer_company.custom_default_price_list:
            price_list = dealer_company.custom_default_price_list
            current_date = today()
            
            items_with_prices = 0
            for item in parts_items:
                valid_price = frappe.get_all("Item Price",
                    filters={
                        "price_list": price_list,
                        "item_code": item.name,
                        "selling": True,
                        "valid_from": ["<=", current_date],
                        "valid_upto": ["in", [None, "", current_date]],
                    },
                    limit=1
                )
                if valid_price:
                    items_with_prices += 1
            
            print(f"   ✓ {items_with_prices}/{len(parts_items)} Parts items have valid prices in '{price_list}'")


if __name__ == "__main__":
    # Allow running directly
    frappe.connect()
    fix_issues()

