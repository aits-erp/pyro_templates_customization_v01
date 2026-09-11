from frappe.utils import flt


def validate_sales_order_item_numbers(doc, method=None):
    for item in doc.items:
        if item.conversion_factor is not None:
            item.conversion_factor = flt(item.conversion_factor) or 1
