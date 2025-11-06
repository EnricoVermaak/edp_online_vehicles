# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

from datetime import datetime, date
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class DealerClaims(Document):
	def validate(self):
		# --- 0️⃣ Auto-set tracking dates based on status ---
		if self.claim_status == "Claim Pending Info" and not self.claim_pending_info_date:
			self.claim_pending_info_date = now_datetime()

		if self.claim_status == "Claim Updated" and not self.claim_updated_date:
			self.claim_updated_date = now_datetime()

		# 1️⃣ Auto-submit if status becomes Remittance
		if self.claim_status == "Remittance":
			self.submit()

		# 2️⃣ Only proceed if there's *any* status
		if not self.claim_status:
			return

		if not self.name:
			return

		# 3️⃣ Check if a Status Tracker exists
		tracker_name = frappe.db.get_value(
			"Status Tracker", {"status_doctype": "Dealer Claims", "document": self.name}, "name"
		)
		if not tracker_name:
			return

		# 4️⃣ Load the Status Tracker doc
		st = frappe.get_doc("Status Tracker", tracker_name)

		# 5️⃣ Make sure it has at least one row in its child table
		if not st.status_tracking_table:
			return

		# 6️⃣ Get the last row
		last_row = st.status_tracking_table[-1]

		# 7️⃣ Parse its timestamp
		prev_dt = last_row.status_updated_on
		if isinstance(prev_dt, str):
			prev_dt = datetime.fromisoformat(prev_dt)

		# 8️⃣ Current timestamp
		now_dt = now_datetime()

		# 9️⃣ Compute delta
		delta = now_dt - prev_dt
		days = delta.days
		seconds = delta.seconds
		hours, remainder = divmod(seconds, 3600)
		minutes, secs = divmod(remainder, 60)

		# 🔟 Build a readable time string
		parts = []
		if days:
			parts.append(f"{days} Day{'s' if days != 1 else ''}")
		if hours:
			parts.append(f"{hours} Hour{'s' if hours != 1 else ''}")
		if minutes:
			parts.append(f"{minutes} Minute{'s' if minutes != 1 else ''}")
		if secs:
			parts.append(f"{secs} Second{'s' if secs != 1 else ''}")
		elapsed_str = " ".join(parts) or "0 Seconds"

		# 1️⃣1️⃣ Append a new row to the status_tracking_table
		st.append(
			"status_tracking_table",
			{"status": self.claim_status, "status_updated_on": now_datetime(), "time_elapsed": elapsed_str},
		)

		# 1️⃣2️⃣ Save the updated tracker
		st.save(ignore_permissions=True)
		frappe.db.commit()

	def after_insert(self):
		tracker_name = frappe.db.get_value(
			"Status Tracker", {"status_doctype": "Dealer Claims", "document": self.name}, "name"
		)
		if not tracker_name:
			st = frappe.new_doc("Status Tracker")
			st.status_doctype = "Dealer Claims"
			st.document = self.name
			st.append(
				"status_tracking_table",
				{
					"status": self.claim_status,
					"status_updated_on": now_datetime(),
					"time_elapsed": "0 seconds",
				},
			)
			st.insert(ignore_permissions=True)
			frappe.db.commit()
                  

@frappe.whitelist()
def dealer(doc, method):
    # 🔹 1. Prevent double cancellation of the same document
    if (doc.claim_status or "").strip().lower() == "cancelled":
        existing_status = frappe.db.get_value("Dealer Claims", doc.name, "claim_status")
        if existing_status and existing_status.strip().lower() == "cancelled":
            frappe.throw("This claim is already cancelled. You cannot cancel it again.")

        # 🔹 2. Prevent another document with same VIN & category from being cancelled again
        for row in doc.table_exgk:
            if row.vin_serial_no:
                existing_cancelled = frappe.db.sql(
                    """
                    SELECT parent.name
                    FROM `tabVehicles Item` AS child
                    JOIN `tabDealer Claims` AS parent
                    ON child.parent = parent.name
                    WHERE parent.claim_category = %s
                    AND parent.claim_status = 'Cancelled'
                    AND child.vin_serial_no = %s
                    AND parent.name != %s
                    """,
                    (doc.claim_category, row.vin_serial_no, doc.name),
                )
                if existing_cancelled:
                    frappe.throw(
                        f"Vehicle ({row.vin_serial_no}) has already been cancelled under the same claim category."
                    )
        return  # agar cancel check pass kar gaya to exit karo

    # 🔹 3. Normal validation for vehicle and duplicate VIN
    for row in doc.table_exgk:
        if row.vin_serial_no:
            # Check if the vehicle belongs to this dealer
            vehicle = frappe.get_doc("Vehicle Stock", row.vin_serial_no)
            if (
                vehicle.original_purchasing_dealer
                and vehicle.original_purchasing_dealer != doc.dealer
            ):
                frappe.throw(
                    "Vehicle was not purchased by the selected dealership on this claim."
                )

            # Check if this VIN has already been claimed under the same category (excluding cancelled)
            existing_claim = frappe.db.sql(
                """
                SELECT parent.name
                FROM `tabVehicles Item` AS child
                JOIN `tabDealer Claims` AS parent
                ON child.parent = parent.name
                WHERE parent.claim_category = %s
                AND child.vin_serial_no = %s
                AND parent.name != %s
                AND parent.claim_status != 'Cancelled'
                """,
                (doc.claim_category, row.vin_serial_no, doc.name),
            )
            

            if existing_claim:
                link = f"<a href='/app/dealer-claims/{existing_claim[0][0]}' target='_blank'>{existing_claim[0][0]}</a>"

                frappe.msgprint(
                    f"VIN '<strong>{row.vin_serial_no}</strong>' has already been claimed under category '<strong>{doc.claim_category}</strong>' "
                    f"in claim {link}. Duplicate claim not allowed.",
                    indicator='red',  
                    alert=False       
                )

                # Document ko save hone se rokne ke liye
                raise frappe.ValidationError("Duplicate claim not allowed.")




    # Step 2: Validate mandatory fields based on claim category and description
    category_doc = frappe.get_doc("Dealer Claim Category", doc.claim_category)
    matching_row = None
    for row in category_doc.claim_types:
        if row.claim_type_description == doc.claim_description:
            matching_row = row
            break

    if matching_row:
        if matching_row.vin_serial_no_mandatory:
            if not doc.table_exgk or len(doc.table_exgk) == 0:
                frappe.throw("VIN/Serial Number list (table_exgk) is mandatory for this claim type.")

        if matching_row.parts_mandatory:
            if not doc.claim_parts or len(doc.claim_parts) == 0:
                frappe.throw("Parts list (claim_parts) is mandatory for this claim type.")

    # Step 3: Check for duplicate VIN/Serial Numbers in the claim
    vin_list = []
    for row in doc.table_exgk:
        if row.vin_serial_no in vin_list:
            frappe.throw(f"Duplicate VIN Serial No found: {row.vin_serial_no}")
        vin_list.append(row.vin_serial_no)

    # Step 4: Ensure invoice_number is unique across Dealer Claims
    if (doc.invoice_number or "").strip():
        if frappe.db.exists("Dealer Claims", {"invoice_number": doc.invoice_number, "name": ["!=", doc.name]}):
            frappe.throw(f"Invoice Number '{doc.invoice_number}' already exists in another record.")

    # Step 4: Ensure invoice_number is unique across Dealer Claims
    if (doc.invoice_number or "").strip():
        if frappe.db.exists("Dealer Claims", {"invoice_number": doc.invoice_number, "name": ["!=", doc.name]}):
            frappe.throw(f"Invoice Number '{doc.invoice_number}' already exists in another record.")

    try:
        if not doc.claim_category:
            return

        claim_category = frappe.get_doc("Dealer Claim Category", doc.claim_category)
        common_vins = []

        # Sab VINs ke liye comparison
        for row in claim_category.claim_types:

            if not row.sale_type:
                continue

            vehicle_retail_docs = frappe.get_all(
                "Vehicle Retail",
                filters={"sale_type": row.sale_type},
                fields=["name"]
            )

            for v_doc in vehicle_retail_docs:
                vr_doc = frappe.get_doc("Vehicle Retail", v_doc.name)
                vr_vins = [v.vin_serial_no for v in vr_doc.vehicles_sale_items]
                claim_vins = [t.vin_serial_no for t in doc.table_exgk]

                for vin in claim_vins:
                    if vin in vr_vins:
                        if vin not in common_vins:
                            common_vins.append(vin)
                    else:
                        frappe.msgprint(f"VIN <strong>{vin}</strong> does not match Sale Type <strong>{row.sale_type}</strong>")

    except Exception as e:
        frappe.msgprint(f"Error: {str(e)}")
        frappe.log_error(frappe.get_traceback(), "Claim Category Validation Error")




    # Step 5: Send email if claim status is "Claim Submitted"
    if doc.claim_status == "Claim Submitted":
        current_user = doc.owner or frappe.session.user
        user_email = frappe.db.get_value("User", current_user, "email")

        if not user_email:
            frappe.log_error(f"Email not found for user {current_user}", "Dealer Claim Email Error")
            return

        subject = f"Dealer Claim Submission Confirmation – {doc.name}"
        message = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:8px; background-color:#f9f9f9;">
        <p style="font-size:16px; font-weight:bold;">Dear {frappe.get_value('User', current_user, 'full_name') or 'User'},</p>

        <p>Thank you for submitting your dealer claim. Your claim has been successfully received by our system and is currently being reviewed.</p>

        <div style="margin:15px 0; padding:15px; background-color:#fff; border:1px solid #eee; border-radius:6px;">
            <p><strong>Claim Reference Number:</strong> {doc.name}</p>
            <p><strong>Dealer Name:</strong> {doc.dealer or 'N/A'}</p>
            <p><strong>Date Submitted:</strong> {doc.invoice_date or 'N/A'}</p>
            <p><strong>Claim Type:</strong> {doc.claim_description or 'N/A'}</p>
        </div>

        <p style="margin-top:30px; font-size:14px; color:#555;">
            Kind regards,<br>
            Customer Support Team
        </p>
    </div>
</body>
</html>
"""

        frappe.sendmail(
            recipients=[user_email],
            subject=subject,
            message=message,
            now=True
        )

        frappe.msgprint("Email sent successfully")




def update_claim_age():
	today = datetime.now().date()

	claims = frappe.get_all(
		"Dealer Claims",
		filters={"claim_status": ["!=", "Remittance"]},
		fields=["name", "creation", "claim_pending_info_date", "claim_updated_date"]
	)

	for c in claims:
		try:
			doc = frappe.get_doc("Dealer Claims", c.name)

			# ---  Claim Age (days since created) ---
			claim_start = doc.creation.date()
			doc.claim_age = (today - claim_start).days

			# ---  Pending Info Age (days since claim_pending_info_date) ---
			if doc.claim_pending_info_date:
				pending_start = doc.claim_pending_info_date.date()
				doc.pending_info_age = (today - pending_start).days
			else:
				doc.pending_info_age = 0

			# ---  Updated Claim Age (days since claim_updated_date) ---
			if doc.claim_updated_date:
				updated_start = doc.claim_updated_date.date()
				doc.updated_claim_age = (today - updated_start).days
			else:
				doc.updated_claim_age = 0

			doc.save(ignore_permissions=True, ignore_version=True)
			frappe.db.commit()

		except Exception as e:
			frappe.log_error(message=str(e), title="Claim Age (Days) Update Error")
