# import frappe

# @frappe.whitelist()
# def get_doctype_fields(doctype):
#     meta = frappe.get_meta(doctype)
#     fields = []
#     for df in meta.fields:
#         if df.fieldtype not in ("Section Break", "Column Break", "Tab Break", "HTML", "Button"):
#             fields.append({
#                 "fieldname": df.fieldname,
#                 "label": df.label or df.fieldname,
#                 "fieldtype": df.fieldtype,
#                 "reqd": df.reqd,
#                 "options": df.options
#             })
#     return fields



import frappe


@frappe.whitelist()
def get_doctype_fields(doctype):
    meta = frappe.get_meta(doctype)
    fields = []
    for df in meta.fields:
        if df.fieldtype not in ("Section Break", "Column Break", "Tab Break", "HTML", "Button"):
            fields.append({
                "fieldname": df.fieldname,
                "label": df.label or df.fieldname,
                "fieldtype": df.fieldtype,
                "reqd": df.reqd,
                "options": df.options
            })
    return fields


@frappe.whitelist()
def get_configured_child_tables():
    """
    Finds every parent DocType that has a Table field pointing to a
    doctype that some Pyro Series Config references.
    Returns: [{parent, fieldname, options}, ...]
    """
    child_doctypes = frappe.get_all(
        "Pyro Series Config",
        filters={"reference_doctype": ["is", "set"]},
        pluck="reference_doctype",
        distinct=True,
    )
    if not child_doctypes:
        return []

    # standard fields (DocField)
    standard = frappe.get_all(
        "DocField",
        filters={"fieldtype": "Table", "options": ["in", child_doctypes]},
        fields=["parent", "fieldname", "options"],
    )

    # custom fields (Custom Field) - in case a table field was added via customization
    custom = frappe.get_all(
        "Custom Field",
        filters={"fieldtype": "Table", "options": ["in", child_doctypes]},
        fields=["dt as parent", "fieldname", "options"],
    )

    return standard + custom


@frappe.whitelist()
def get_templates_for(reference_doctype):
    return frappe.get_all(
        "Pyro Series Config",
        filters={"reference_doctype": reference_doctype},
        fields=["name", "template_name"],
    )