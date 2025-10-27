import frappe

def get_active_dealer_orders(dealer,floorplan):
    status_list = ['Finance Approved', 'Dealer Approved', 'Dealer Pending Approval', 'Approved', 'Modify & Update', 'Processed']

    order_prices = frappe.get_all(
        'Head Office Vehicle Orders',
        filters={
            "status": ["in", status_list],
            "order_placed_by": dealer,
            "floorplan": floorplan
        },
        pluck='price_excl'
    )

    total = sum(order_prices) if order_prices else 0
    return total
