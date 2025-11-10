# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

import frappe
from datetime import datetime, date,time
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
def dealer(doc=None, vinno=None, dealer=None, claim_type_code=None, docname=None):
    try:
        # Convert JSON string to dict if needed
        if isinstance(doc, str):
            try:
                doc = frappe.parse_json(doc)
            except Exception:
                frappe.throw("Invalid JSON for doc parameter")
        
        # Convert dict to Doc object
        if isinstance(doc, dict):
            doc = frappe.get_doc(doc)
        
        # Load from DB if docname provided
        elif docname and frappe.db.exists("Dealer Claims", docname):
            doc = frappe.get_doc("Dealer Claims", docname)
            
        if not doc:
            frappe.throw("No valid document or docname provided")

        # Validate claim category exists
        if not doc.claim_category:
            return

        claim_category = frappe.get_doc("Dealer Claim Category", doc.claim_category)
        claim_vins = [t.vin_serial_no.strip() for t in doc.table_exgk if t.vin_serial_no]
        matched_vins = set()

        # Check each sale_type and mark vins that match
        for row in claim_category.claim_types:
            if not row.sale_type:
                continue

            vehicle_retail_docs = frappe.get_all(
                "Vehicle Retail",
                filters={"sale_type": row.sale_type},
                fields=["name"]
            )

            vr_vins = set()
            for v_doc in vehicle_retail_docs:
                vr_doc = frappe.get_doc("Vehicle Retail", v_doc.name)
                for v in getattr(vr_doc, "vehicles_sale_items", []):
                    if v.vin_serial_no:
                        vr_vins.add(v.vin_serial_no.strip())

            # Mark matched vins for this sale_type
            for vin in claim_vins:
                if vin in vr_vins:
                    matched_vins.add(vin)

        # Find VINs not matching sale_type
        missing_vins = [vin for vin in claim_vins if vin not in matched_vins]

        if missing_vins:
            sale_type = next(
                (ct.sale_type for ct in claim_category.claim_types 
                 if ct.claim_type_description == doc.claim_description),
                "N/A"
            )

            # Create message for unmatched VINs
            message = "<br>".join([
                f"VIN <strong>{vin}</strong> is not eligible for <strong>{doc.claim_description}</strong>. "
                f"VIN was not retailed as <strong>{sale_type}</strong>."
                for vin in missing_vins
            ])

            # Update and persist claim status
            doc.claim_status = "Claim Declined"
            if doc.name:
                frappe.db.set_value("Dealer Claims", doc.name, "claim_status", "Claim Declined")
                frappe.db.commit()

            # Show message and stop processing
            frappe.msgprint(message, indicator="red", alert=False)

    except Exception as e:
        if isinstance(e, frappe.ValidationError):
            raise
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

        <p>Thank you for submitting your dealer claim.</p>
        <p>Your claim has been successfully received by our system and is currently being reviewed.</p>

        <div style="margin:15px 0; padding:15px; background-color:#fff; border:1px solid #eee; border-radius:6px;">
            <p style="margin-bottom:8px; font-weight:bold;">Claim Details:</p>
            <ul style="margin:0; padding-left:20px; line-height:1.6;">
                <li><strong>Claim Reference Number:</strong> {doc.name}</li>
                <li><strong>Dealer Name:</strong> {doc.dealer or 'N/A'}</li>
                <li><strong>Date Submitted:</strong> {doc.claim_datetime or 'N/A'}</li>
                <li><strong>Claim Type:</strong> {doc.claim_description or 'N/A'}</li>
            </ul>
        </div>

        <p style="margin-top:30px; font-size:14px; color:#555;">
            Kind regards
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
