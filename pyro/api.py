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

import json


# MULTIPOINT_POINT_FIELDS = [
#     {"fieldname": "point_no", "label": "Point No (e.g. U1)", "fieldtype": "Data"},
#     {"fieldname": "tt_tag_number", "label": "TT Tag Number", "fieldtype": "Data"},
#     {"fieldname": "te_tag_number", "label": "TE Tag Number", "fieldtype": "Data"},
#     {"fieldname": "tw_tag_number", "label": "TW Tag Number", "fieldtype": "Data"},
#     {"fieldname": "hot_junction_location_mm", "label": "Hot Junction Location mm", "fieldtype": "Float"},
#     {"fieldname": "head_extension_n_mm", "label": "Head Extension N mm", "fieldtype": "Float"},
#     {"fieldname": "lagging_extension_t_mm", "label": "Lagging Extension T mm", "fieldtype": "Float"},
#     {"fieldname": "overall_length_ol_mm", "label": "Overall Length OL mm", "fieldtype": "Float"},
# ]
MULTIPOINT_POINT_FIELDS = [
    {"fieldname": "sl_no", "label": "Sl No", "fieldtype": "Int", "readonly": 1},
    {"fieldname": "tt_tag_number", "label": "TT Tag Number", "fieldtype": "Data"},
    {"fieldname": "te_tag_number", "label": "TE Tag Number", "fieldtype": "Data"},
    {"fieldname": "tw_tag_number", "label": "TW Tag Number", "fieldtype": "Data"},
    {"fieldname": "point_no", "label": "Point No (e.g. U1)", "fieldtype": "Data"},
    {"fieldname": "hot_junction_location_mm", "label": "Hot Junction Location mm", "fieldtype": "Float"},
    {"fieldname": "head_extension_n_mm", "label": "Head Extension N mm", "fieldtype": "Float"},
    {"fieldname": "lagging_extension_t_mm", "label": "Lagging Extension T mm", "fieldtype": "Float"},
    {"fieldname": "overall_length_ol_mm", "label": "Overall Length OL mm", "fieldtype": "Float"},
]


@frappe.whitelist()
def get_multipoint_point_fields():
    return MULTIPOINT_POINT_FIELDS


@frappe.whitelist()
def get_multipoint_templates_for(reference_doctype):
    return frappe.get_all(
        "Pyro Series Config",
        filters={"reference_doctype": reference_doctype, "is_multipoint": 1},
        fields=["name", "template_name"],
    )


@frappe.whitelist()
def get_multipoint_points(parent_doctype, parent_name, item_row):
    return frappe.get_all(
        "Pyro Multipoint Point",
        filters={
            "parent_doctype": parent_doctype,
            "parent_name": parent_name,
            "item_row": item_row
        },
        fields=[
            "name", "sl_no", "point_no", "tt_tag_number", "te_tag_number",
            "tw_tag_number", "hot_junction_location_mm", "head_extension_n_mm",
            "lagging_extension_t_mm", "overall_length_ol_mm"
        ],
        order_by="sl_no asc"
    )


@frappe.whitelist()
def save_multipoint_points(parent_doctype, parent_name, item_row, points):
    if isinstance(points, str):
        points = json.loads(points)

    frappe.db.delete("Pyro Multipoint Point", {
        "parent_doctype": parent_doctype,
        "parent_name": parent_name,
        "item_row": item_row
    })

    for i, p in enumerate(points):
        doc = frappe.new_doc("Pyro Multipoint Point")
        doc.parent_doctype = parent_doctype
        doc.parent_name = parent_name
        doc.item_row = item_row
        doc.sl_no = i + 1
        doc.point_no = p.get("point_no")
        doc.tt_tag_number = p.get("tt_tag_number")
        doc.te_tag_number = p.get("te_tag_number")
        doc.tw_tag_number = p.get("tw_tag_number")
        doc.hot_junction_location_mm = p.get("hot_junction_location_mm")
        doc.head_extension_n_mm = p.get("head_extension_n_mm")
        doc.lagging_extension_t_mm = p.get("lagging_extension_t_mm")
        doc.overall_length_ol_mm = p.get("overall_length_ol_mm")
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
    return {"status": "success", "count": len(points)}
@frappe.whitelist()
def get_multipoint_summary(parent_doctype, parent_name, item_row):
    item_data = frappe.get_all(
        "Pyro Multipoint Point",
        filters={"parent_doctype": parent_doctype, "parent_name": parent_name, "item_row": item_row},
        fields=["point_no", "tt_tag_number", "te_tag_number", "tw_tag_number",
                "hot_junction_location_mm", "head_extension_n_mm",
                "lagging_extension_t_mm", "overall_length_ol_mm"],
        order_by="sl_no asc"
    )
    return item_data