# import frappe


# def capture_sales_order_delivery_date(doc, method=None):
#     """
#     Capture the Sales Order header delivery date BEFORE ERPNext
#     recalculates it from Sales Order Item delivery dates.

#     doc.flags survives throughout the current save request.
#     """

#     if doc.delivery_date:
#         doc.flags.pyro_original_delivery_date = doc.delivery_date

#         frappe.logger("pyro").info(
#             f"Sales Order {doc.name or 'NEW'}: "
#             f"captured original delivery_date = {doc.delivery_date}"
#         )


# def preserve_sales_order_delivery_date(doc, method=None):
#     """
#     Restore the Sales Order header Delivery Date after ERPNext
#     validation has potentially changed it from an item row date.
#     """

#     original_delivery_date = getattr(
#         doc.flags,
#         "pyro_original_delivery_date",
#         None
#     )

#     # Fallback for an existing Sales Order if flag is unavailable
#     if not original_delivery_date and not doc.is_new():

#         old_doc = doc.get_doc_before_save()

#         if old_doc and old_doc.delivery_date:
#             original_delivery_date = old_doc.delivery_date

#     if not original_delivery_date:
#         return

#     if str(doc.delivery_date) != str(original_delivery_date):

#         frappe.logger("pyro").info(
#             f"Sales Order {doc.name or 'NEW'}: "
#             f"restoring delivery_date "
#             f"{doc.delivery_date} -> {original_delivery_date}"
#         )

#         doc.delivery_date = original_delivery_date