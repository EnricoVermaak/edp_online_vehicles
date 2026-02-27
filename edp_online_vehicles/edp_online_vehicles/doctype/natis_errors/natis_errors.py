# # Copyright (c) 2024, NexTash and contributors
# # For license information, please see license.txt

# # File: natis_errors/natis_errors/api.py
# import frappe

# @frappe.whitelist()
# def get_natis_errors(limit=50):
#     # Direct query from your table
#     data = frappe.db.sql(f"""
#         SELECT 
#             post_date, post_time, post_type, error_code, error_field,
#             error_descr, stock_no, vin_no, brand_id, client_name,
#             client_id_type, client_id_number, dealer_id, email_sent_on
#         FROM natis_errors
#         ORDER BY post_date DESC, post_time DESC
#         LIMIT %s
#     """, (limit,), as_dict=True)

#     return data