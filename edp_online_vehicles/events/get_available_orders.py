import frappe
import json

@frappe.whitelist()
def get_unallocated_hq_deals(model, colour):
    colour = frappe.get_value("Model Colour", colour, "colour")
    orders = frappe.get_all(
        "Head Office Vehicle Orders",
        filters=[
            ["model", "=", model],
            ["colour", "=", colour],
            ["vinserial_no", "in", ["", None]],
            ["shipment_stock", "in", ["", None]],
        ],
        fields=["name", "order_placed_by"],
        order_by="order_datetime asc"
    )

    # frappe.msgprint(f"""
    #     Orders found: {orders}
    #     model: {model}
    #     colour: {colour}
    # """)  
    return orders

@frappe.whitelist()
def update_stock_on_orders(records):

    records = json.loads(records)

    for record in records:
        order_name = record.get("reserve_to_order")
        vin_serial_no = record.get("vin_serial_no")

        if order_name and vin_serial_no:
            order = frappe.get_doc("Head Office Vehicle Orders", order_name)
            order.vinserial_no = vin_serial_no
            order.shipment_stock = None
            order.save(ignore_permissions=True)

@frappe.whitelist()
def get_order_dealer(order_no):
    dealer = frappe.get_value("Head Office Vehicle Orders", order_no, "order_placed_by")
    return dealer

@frappe.whitelist()
def unallocate_shipment(shipment_no,shipment_stock):
    # frappe.throw(f"""
    #     shipment_no: {shipment_no}
    #     shipment_stock: {shipment_stock}       
    # """)
    frappe.db.set_value("Vehicles Shipment Items", {"vin_serial_no": shipment_stock, "parent": shipment_no}, "reserve_to_order", None)
    frappe.db.commit()
    