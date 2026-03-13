import frappe

REQUIRED_PERMISSIONS = [
    ("System Manager",               1, 1, 1, 1),
    ("Vehicles Administrator",       1, 1, 1, 1),
    ("Dealer Vehicle Administrator", 1, 0, 0, 0),
    ("Aftersales Manager",           1, 0, 0, 0),
    ("Desk User",                    1, 0, 0, 0),
]


def execute():
    print("=" * 70)
    print("Bulletin Permissions Patch")
    print("=" * 70)

    existing = frappe.db.sql(
        "SELECT role FROM tabDocPerm WHERE parent = 'Bulletin'",
        pluck="role",
    )
    existing_roles = set(existing)
    print(f"  Existing permission roles: {sorted(existing_roles)}")

    added = []
    skipped = []

    for role, read, write, create, delete in REQUIRED_PERMISSIONS:
        if role in existing_roles:
            skipped.append(role)
            print(f"  [SKIP]  {role} — already exists")
            continue

        doc = frappe.get_doc({
            "doctype": "DocPerm",
            "parent": "Bulletin",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": role,
            "read": read,
            "write": write,
            "create": create,
            "delete": delete,
            "submit": 0,
            "cancel": 0,
            "amend": 0,
            "report": read,
            "export": read,
            "print": read,
            "email": read,
            "share": read,
        })
        doc.insert(ignore_permissions=True)
        added.append(role)
        print(f"  [ADD]   {role} — read={read} write={write} create={create} delete={delete}")

    frappe.db.commit()

    print()
    print(f"  Added:   {added or 'none'}")
    print(f"  Skipped: {skipped or 'none'}")
    print("=" * 70)
    print("Bulletin Permissions Patch Complete!")
    print("=" * 70)
