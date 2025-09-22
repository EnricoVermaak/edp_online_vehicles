# Copyright (c) 2024, NexTash and contributors
# For license information, please see license.txt

from datetime import datetime

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class DealerClaims(Document):
	def validate(self):
		# 1. Auto-submit if status becomes Remittance
		if self.claim_status == "Remittance":
			self.submit()

			# 2. Only proceed if there's *any* status
		if not self.claim_status:
			return

		if not self.name:
			return

			# 3. Check if a Status Tracker exists
		tracker_name = frappe.db.get_value(
			"Status Tracker", {"status_doctype": "Dealer Claims", "document": self.name}, "name"
		)
		if not tracker_name:
			return

			# 4. Load the Status Tracker doc
		st = frappe.get_doc("Status Tracker", tracker_name)

		# 5. Make sure it has at least one row in its child table
		if not st.status_tracking_table:
			return

			# 6. Get the last row
		last_row = st.status_tracking_table[-1]

		# 7. Parse its timestamp
		prev_dt = last_row.status_updated_on
		if isinstance(prev_dt, str):
			# convert string to datetime
			prev_dt = datetime.fromisoformat(prev_dt)

			# 8. Current timestamp
		now_dt = now_datetime()

		# 9. Compute delta
		delta = now_dt - prev_dt

		# 10. Break into components
		days = delta.days
		seconds = delta.seconds
		hours, remainder = divmod(seconds, 3600)
		minutes, secs = divmod(remainder, 60)

		# 11. Build a human readable string
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

		# Append a new row to the status_tracking_table
		st.append(
			"status_tracking_table",
			{"status": self.claim_status, "status_updated_on": now_datetime(), "time_elapsed": elapsed_str},
		)

		# Save the updated tracker
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
					"time_elapsed": "O seconds",
				},
			)

			st.insert(ignore_permissions=True)
			frappe.db.commit()
