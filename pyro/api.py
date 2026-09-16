import frappe
import json


# ============================================================
# EXISTING PYRO APIs
# ============================================================

@frappe.whitelist()
def get_doctype_fields(doctype):
    meta = frappe.get_meta(doctype)

    fields = []

    for df in meta.fields:
        if df.fieldtype not in (
            "Section Break",
            "Column Break",
            "Tab Break",
            "HTML",
            "Button",
        ):
            fields.append({
                "fieldname": df.fieldname,
                "label": df.label or df.fieldname,
                "fieldtype": df.fieldtype,
                "reqd": df.reqd,
                "options": df.options,
            })

    return fields


@frappe.whitelist()
def get_configured_child_tables():
    """
    Finds every parent DocType that has a Table field pointing to a
    doctype that some Pyro Series Config references.
    """

    child_doctypes = frappe.get_all(
        "Pyro Series Config",
        filters={
            "reference_doctype": ["is", "set"]
        },
        pluck="reference_doctype",
        distinct=True,
    )

    if not child_doctypes:
        return []

    standard = frappe.get_all(
        "DocField",
        filters={
            "fieldtype": "Table",
            "options": ["in", child_doctypes],
        },
        fields=[
            "parent",
            "fieldname",
            "options",
        ],
    )

    custom = frappe.get_all(
        "Custom Field",
        filters={
            "fieldtype": "Table",
            "options": ["in", child_doctypes],
        },
        fields=[
            "dt as parent",
            "fieldname",
            "options",
        ],
    )

    return standard + custom


@frappe.whitelist()
def get_templates_for(reference_doctype):
    return frappe.get_all(
        "Pyro Series Config",
        filters={
            "reference_doctype": reference_doctype
        },
        fields=[
            "name",
            "template_name",
        ],
    )


# ============================================================
# MULTIPOINT
# ============================================================

MULTIPOINT_POINT_FIELDS = [
    {
        "fieldname": "sl_no",
        "label": "Sl No",
        "fieldtype": "Int",
        "readonly": 1,
    },
    {
        "fieldname": "tt_tag_number",
        "label": "TT Tag Number",
        "fieldtype": "Data",
    },
    {
        "fieldname": "te_tag_number",
        "label": "TE Tag Number",
        "fieldtype": "Data",
    },
    {
        "fieldname": "tw_tag_number",
        "label": "TW Tag Number",
        "fieldtype": "Data",
    },
    {
        "fieldname": "point_no",
        "label": "Point No (e.g. U1)",
        "fieldtype": "Data",
    },
    {
        "fieldname": "hot_junction_location_mm",
        "label": "Hot Junction Location mm",
        "fieldtype": "Float",
    },
    {
        "fieldname": "head_extension_n_mm",
        "label": "Head Extension N mm",
        "fieldtype": "Float",
    },
    {
        "fieldname": "lagging_extension_t_mm",
        "label": "Lagging Extension T mm",
        "fieldtype": "Float",
    },
    {
        "fieldname": "overall_length_ol_mm",
        "label": "Overall Length OL mm",
        "fieldtype": "Float",
    },
]


@frappe.whitelist()
def get_multipoint_point_fields():
    return MULTIPOINT_POINT_FIELDS


@frappe.whitelist()
def get_multipoint_templates_for(reference_doctype):
    return frappe.get_all(
        "Pyro Series Config",
        filters={
            "reference_doctype": reference_doctype,
            "is_multipoint": 1,
        },
        fields=[
            "name",
            "template_name",
        ],
    )


@frappe.whitelist()
def get_multipoint_points(
    parent_doctype,
    parent_name,
    item_row
):
    return frappe.get_all(
        "Pyro Multipoint Point",
        filters={
            "parent_doctype": parent_doctype,
            "parent_name": parent_name,
            "item_row": item_row,
        },
        fields=[
            "name",
            "sl_no",
            "point_no",
            "tt_tag_number",
            "te_tag_number",
            "tw_tag_number",
            "hot_junction_location_mm",
            "head_extension_n_mm",
            "lagging_extension_t_mm",
            "overall_length_ol_mm",
        ],
        order_by="sl_no asc",
    )


@frappe.whitelist()
def save_multipoint_points(
    parent_doctype,
    parent_name,
    item_row,
    points
):
    if isinstance(points, str):
        points = json.loads(points)

    frappe.db.delete(
        "Pyro Multipoint Point",
        {
            "parent_doctype": parent_doctype,
            "parent_name": parent_name,
            "item_row": item_row,
        },
    )

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

        doc.hot_junction_location_mm = p.get(
            "hot_junction_location_mm"
        )

        doc.head_extension_n_mm = p.get(
            "head_extension_n_mm"
        )

        doc.lagging_extension_t_mm = p.get(
            "lagging_extension_t_mm"
        )

        doc.overall_length_ol_mm = p.get(
            "overall_length_ol_mm"
        )

        doc.insert(
            ignore_permissions=True
        )

    frappe.db.commit()

    return {
        "status": "success",
        "count": len(points),
    }


@frappe.whitelist()
def get_multipoint_summary(
    parent_doctype,
    parent_name,
    item_row
):
    item_data = frappe.get_all(
        "Pyro Multipoint Point",
        filters={
            "parent_doctype": parent_doctype,
            "parent_name": parent_name,
            "item_row": item_row,
        },
        fields=[
            "point_no",
            "tt_tag_number",
            "te_tag_number",
            "tw_tag_number",
            "hot_junction_location_mm",
            "head_extension_n_mm",
            "lagging_extension_t_mm",
            "overall_length_ol_mm",
        ],
        order_by="sl_no asc",
    )

    return item_data


def ensure_pyro_item_group(item_group):
    """
    Get Item Group from Excel.
    Create it automatically if it does not exist.
    """

    if not item_group:
        return None

    item_group = str(item_group).strip()

    if not item_group:
        return None

    # Existing Item Group
    if frappe.db.exists("Item Group", item_group):
        return item_group

    # Create missing Item Group
    group = frappe.new_doc("Item Group")
    group.item_group_name = item_group
    group.parent_item_group = "All Item Groups"
    group.is_group = 0

    group.insert(ignore_permissions=True)

    return group.name

# ============================================================
# ITEM MASTER
# ============================================================

@frappe.whitelist()
def ensure_pyro_items(rows):
    """
    Create or reuse standard ERPNext Item Master records.

    Rules:
    - Item Code comes ONLY from item_code.
    - Model No is never used as Item Code.
    - Client Model No is never used as Item Code.
    - detail_model_number is never used as Item Code.
    - deatil_model_number is never used as Item Code.
    - Existing Item is reused.
    - Existing Item is updated only with non-blank matching
      Item Master fields supplied from Excel.
    - Missing Item is created.
    - item_group comes from Excel item_group when supplied.
    - gst_hsn_code comes from Excel gst_hsn_code when supplied.
    - Other matching Item fields are copied.
    - Empty Excel fields remain empty for new Items and do not
      overwrite existing Item values.
    - Duplicate Item Codes inside the same Excel are rejected.
    """

    # ---------------------------------------------------------
    # Convert JSON string to Python list
    # ---------------------------------------------------------

    if isinstance(rows, str):
        try:
            rows = json.loads(rows)
        except Exception:
            frappe.throw(
                "Invalid item data received."
            )

    if not isinstance(rows, list):
        frappe.throw(
            "Invalid item data received."
        )

    if not rows:
        return []

    # ---------------------------------------------------------
    # Item Master Metadata
    # ---------------------------------------------------------

    item_meta = frappe.get_meta("Item")

    item_fields = {
        df.fieldname: df
        for df in item_meta.fields
        if df.fieldname
        and df.fieldtype not in (
            "Section Break",
            "Column Break",
            "Tab Break",
            "HTML",
            "Button",
        )
    }

    # ---------------------------------------------------------
    # Fields that must never be copied directly
    # ---------------------------------------------------------

    ignored_fields = {
        "name",
        "doctype",
        "parent",
        "parentfield",
        "parenttype",
        "idx",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
    }

    # ---------------------------------------------------------
    # Validate Item Codes
    #
    # ONLY item_code is accepted.
    #
    # Model No / Client Model No / Detail Model Number
    # are NOT used as Item Code.
    # ---------------------------------------------------------

    seen_codes = {}
    prepared_rows = []

    for row_index, row in enumerate(rows, start=1):

        if not isinstance(row, dict):
            continue

        # IMPORTANT:
        # Item Code comes ONLY from Excel item_code.
        item_code = row.get("item_code")

        if item_code is None:
            item_code = ""

        item_code = str(item_code).strip()

        # -----------------------------------------------------
        # Item Code required
        # -----------------------------------------------------

        if not item_code:
            frappe.throw(
                f"Item Code is required in Excel row {row_index}."
            )

        # -----------------------------------------------------
        # Duplicate validation
        # -----------------------------------------------------

        normalized_code = item_code.upper()

        if normalized_code in seen_codes:

            first_row = seen_codes[
                normalized_code
            ]

            frappe.throw(
                f"Duplicate Item Code "
                f"<b>{frappe.utils.escape_html(item_code)}</b> "
                f"found in Excel rows "
                f"<b>{first_row}</b> and "
                f"<b>{row_index}</b>."
            )

        seen_codes[
            normalized_code
        ] = row_index

        prepared_rows.append({
            "item_code": item_code,
            "row": row,
        })

    # ---------------------------------------------------------
    # Create / Reuse Items
    # ---------------------------------------------------------

    result = []

    for data in prepared_rows:

        item_code = data["item_code"]
        row = data["row"]

        # =====================================================
        # EXISTING ITEM
        # =====================================================

        existing_item = frappe.db.exists(
            "Item",
            item_code
        )

        if existing_item:

            item = frappe.get_doc(
                "Item",
                existing_item
            )

            changed = False

            # -------------------------------------------------
            # Update supplied Item Master fields
            # -------------------------------------------------

            for fieldname, value in row.items():

                if not fieldname:
                    continue

                fieldname = str(
                    fieldname
                ).strip()

                if fieldname in ignored_fields:
                    continue

                # Never modify Item Code
                if fieldname == "item_code":
                    continue

                # These fields can NEVER define Item Code.
                # If they are actual Item fields, they can still
                # be copied as normal Item fields.
                if fieldname not in item_fields:
                    continue

                df = item_fields[
                    fieldname
                ]

                if df.fieldtype in (
                    "Table",
                    "Section Break",
                    "Column Break",
                    "Tab Break",
                    "HTML",
                    "Button",
                ):
                    continue

                if value is None:
                    continue

                if isinstance(value, str):
                    value = value.strip()

                # Do not overwrite existing Item values
                # with blank Excel values.
                if value == "":
                    continue

                current_value = item.get(
                    fieldname
                )

                if current_value != value:
                    item.set(
                        fieldname,
                        value
                    )

                    changed = True

            # -------------------------------------------------
            # Save existing Item if changed
            # -------------------------------------------------

            if changed:
                item.save(
                    ignore_permissions=True
                )

            result.append({
                "item_code": item_code,
                "status": "existing",
                "name": existing_item,
            })

            continue

        # =====================================================
        # NEW ITEM
        # =====================================================

        item = frappe.new_doc(
            "Item"
        )

        # -----------------------------------------------------
        # Item Code ONLY from Excel item_code
        # -----------------------------------------------------

        item.item_code = item_code

        # -----------------------------------------------------
        # Item Group from Excel
        # -----------------------------------------------------

        item_group = str(
            row.get("item_group") or ""
        ).strip()

        if item_group:
            item.item_group = ensure_pyro_item_group(
                item_group
            )

        # =====================================================
        # COPY EXCEL FIELDS TO ITEM MASTER
        # =====================================================

        for fieldname, value in row.items():

            if not fieldname:
                continue

            fieldname = str(
                fieldname
            ).strip()

            # -------------------------------------------------
            # Never override Item Code
            # -------------------------------------------------

            if fieldname == "item_code":
                continue

            # -------------------------------------------------
            # Technical fields
            # -------------------------------------------------

            if fieldname in ignored_fields:
                continue

            # -------------------------------------------------
            # Only actual Item Master fields
            # -------------------------------------------------

            if fieldname not in item_fields:
                continue

            df = item_fields[
                fieldname
            ]

            # -------------------------------------------------
            # No child/layout fields
            # -------------------------------------------------

            if df.fieldtype in (
                "Table",
                "Section Break",
                "Column Break",
                "Tab Break",
                "HTML",
                "Button",
            ):
                continue

            # -------------------------------------------------
            # Empty value
            # -------------------------------------------------

            if value is None:
                continue

            if isinstance(value, str):
                value = value.strip()

            if value == "":
                continue

            # -------------------------------------------------
            # Set Item Master field
            # -------------------------------------------------

            item.set(
                fieldname,
                value
            )

        # -----------------------------------------------------
        # Protect Item Code
        # -----------------------------------------------------

        item.item_code = item_code

        # -----------------------------------------------------
        # Preserve existing Pyro behavior
        # -----------------------------------------------------

        if "is_stock_item" in item_fields:

            if not getattr(
                item,
                "is_stock_item",
                None
            ):
                item.is_stock_item = 1

        # =====================================================
        # IMPORTANT:
        #
        # Item Group and HSN/SAC are NOT forced mandatory here.
        #
        # If Excel contains them, they are copied.
        # If Excel does not contain them, they remain empty.
        # =====================================================

        # =====================================================
        # INSERT ITEM
        # =====================================================

        try:

            item.insert(
                ignore_permissions=True,
                ignore_mandatory=True
            )

        except frappe.DuplicateEntryError:

            # -------------------------------------------------
            # Race-condition protection
            #
            # Another process may have created the same Item
            # between exists() and insert().
            # -------------------------------------------------

            if frappe.db.exists(
                "Item",
                item_code
            ):

                result.append({
                    "item_code": item_code,
                    "status": "existing",
                    "name": item_code,
                })

                continue

            raise

        # -----------------------------------------------------
        # Created successfully
        # -----------------------------------------------------

        result.append({
            "item_code": item_code,
            "status": "created",
            "name": item.name,
        })

    # ---------------------------------------------------------
    # Return result
    # ---------------------------------------------------------

    return result