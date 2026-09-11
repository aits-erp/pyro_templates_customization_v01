window.pyro = window.pyro || {};

pyro.bulk_edit = {

    // ============================================================
    // OPEN
    // ============================================================

    open: function (frm, opts) {

        frappe.call({

            method: "pyro.api.get_doctype_fields",

            args: {
                doctype: opts.child_doctype
            },

            callback: function (res) {

                let allFields = res.message || [];

                let mandatoryFields =
                    allFields.filter(
                        f => f.reqd
                    );


                frappe.db
                    .get_doc(
                        "Pyro Series Config",
                        opts.template_name
                    )
                    .then(function (templateDoc) {

                        let includedCustom =
                            (
                                templateDoc.fields_table || []
                            ).filter(
                                f => f.include
                            );


                        let seen = {};

                        let columns = [];


                        // ====================================================
                        // MANDATORY SALES ORDER ITEM FIELDS
                        // ====================================================

                        mandatoryFields.forEach(function (f) {

                            columns.push({

                                fieldname:
                                    f.fieldname,

                                label:
                                    f.label,

                                fieldtype:
                                    f.fieldtype,

                                options:
                                    f.options

                            });

                            seen[f.fieldname] = true;

                        });


                        // ====================================================
                        // CONFIGURED PYRO FIELDS
                        // ====================================================

                        includedCustom.forEach(function (f) {

                            if (
                                !seen[
                                    f.fieldname
                                ]
                            ) {

                                columns.push({

                                    fieldname:
                                        f.fieldname,

                                    label:
                                        f.label,

                                    fieldtype:
                                        f.field_type,

                                    options:
                                        f.options

                                });

                                seen[
                                    f.fieldname
                                ] = true;

                            }

                        });


                        // ====================================================
                        // ITEM MASTER FIELDS
                        //
                        // These are mandatory for creating Item Master
                        // in your current setup.
                        //
                        // Item Code
                        // Item Name
                        // Item Group
                        // HSN/SAC
                        // ====================================================

                        let itemMasterFields = [

                            {
                                fieldname:
                                    "item_group",

                                label:
                                    "Item Group",

                                fieldtype:
                                    "Link",

                                options:
                                    "Item Group",

                                item_master_only:
                                    true
                            },

                            {
                                fieldname:
                                    "gst_hsn_code",

                                label:
                                    "HSN/SAC",

                                fieldtype:
                                    "Link",

                                options:
                                    "GST HSN Code",

                                item_master_only:
                                    true
                            }

                        ];


                        // ====================================================
                        // INSERT AFTER ITEM NAME
                        // ====================================================

                        let itemNameIndex =
                            columns.findIndex(
                                function (c) {

                                    return (
                                        c.fieldname ===
                                        "item_name"
                                    );

                                }
                            );


                        itemMasterFields.forEach(function (f) {

                            if (
                                seen[
                                    f.fieldname
                                ]
                            ) {
                                return;
                            }


                            if (
                                itemNameIndex >= 0
                            ) {

                                columns.splice(

                                    itemNameIndex + 1,

                                    0,

                                    f

                                );

                                itemNameIndex++;

                            }
                            else {

                                columns.push(
                                    f
                                );

                            }


                            seen[
                                f.fieldname
                            ] = true;

                        });


                        // ====================================================
                        // OPEN TABLE
                        // ====================================================

                        pyro.bulk_edit._render(
                            frm,
                            columns,
                            opts
                        );

                    });

            }

        });

    },


    // ============================================================
    // RENDER
    // ============================================================

    _render: function (frm, columns, opts) {

        let child_fieldname =
            opts.child_fieldname;


        let anchor_field =
            columns[0]
                ? columns[0].fieldname
                : null;


        let has_item_lookup =
            columns.some(
                c =>
                    c.fieldname === "item_code" &&
                    c.options === "Item"
            );


        let existingData =
            (
                frm.doc[
                    child_fieldname
                ] || []
            ).map(
                r => ({ ...r })
            );


        let dialog =
            new frappe.ui.Dialog({

                title:
                    frm.doc.doctype +
                    " Items - " +
                    opts.template_name,

                size:
                    "extra-large",

                fields: [

                    {
                        fieldname:
                            "table_html",

                        fieldtype:
                            "HTML"
                    }

                ],

                primary_action_label:
                    "Save",

                primary_action:
                    function () {

                        let rows =
                            getRowsFromTable();


                        if (
                            !anchor_field ||
                            !rows.some(
                                r =>
                                    r[
                                        anchor_field
                                    ]
                            )
                        ) {

                            frappe.msgprint(
                                `Enter at least one row with a valid ${
                                    anchor_field ||
                                    "key field"
                                }`
                            );

                            return;

                        }


                        // ====================================================
                        // REMOVE EMPTY ROWS
                        // ====================================================

                        rows =
                            rows.filter(function (r) {

                                return (
                                    r[
                                        anchor_field
                                    ] !== undefined &&
                                    String(
                                        r[
                                            anchor_field
                                        ] || ""
                                    ).trim() !== ""
                                );

                            });


                        if (!rows.length) {

                            frappe.msgprint(
                                "Please enter at least one Item Code."
                            );

                            return;

                        }


                        // ====================================================
                        // ITEM CODE VALIDATION
                        //
                        // ONLY item_code is used.
                        // Model No is NEVER used.
                        // ====================================================

                        let itemCodes = {};

                        let duplicateCodes = [];


                        rows.forEach(function (r) {

                            let code =
                                r.item_code
                                    ? String(
                                        r.item_code
                                    ).trim()
                                    : "";


                            if (!code) {
                                return;
                            }


                            let normalized =
                                code.toLowerCase();


                            if (
                                itemCodes[
                                    normalized
                                ]
                            ) {

                                if (
                                    !duplicateCodes.includes(
                                        code
                                    )
                                ) {

                                    duplicateCodes.push(
                                        code
                                    );

                                }

                            }
                            else {

                                itemCodes[
                                    normalized
                                ] = true;

                            }

                        });


                        if (
                            duplicateCodes.length
                        ) {

                            frappe.msgprint({

                                title:
                                    "Duplicate Item Code",

                                message:
                                    "Duplicate Item Code found in Excel:<br><br>" +
                                    duplicateCodes.join(
                                        "<br>"
                                    ) +
                                    "<br><br>Each Item Code must be unique.",

                                indicator:
                                    "red"

                            });

                            return;

                        }


                        // ====================================================
                        // CHECK ITEM CODE
                        // ====================================================

                        let missingItemCode =
                            rows.find(
                                r =>
                                    !r.item_code ||
                                    !String(
                                        r.item_code
                                    ).trim()
                            );


                        if (missingItemCode) {

                            frappe.msgprint({

                                title:
                                    "Item Code Required",

                                message:
                                    "Item Code is required for every row.",

                                indicator:
                                    "red"

                            });

                            return;

                        }


                        // ====================================================
                        // CHECK ITEM GROUP
                        // ====================================================

                        let missingItemGroup =
                            rows.find(
                                r =>
                                    !r.item_group ||
                                    !String(
                                        r.item_group
                                    ).trim()
                            );


                        if (missingItemGroup) {

                            frappe.msgprint({

                                title:
                                    "Item Group Required",

                                message:
                                    "Item Group is required for every Item.",

                                indicator:
                                    "red"

                            });

                            return;

                        }


                        // ====================================================
                        // CHECK HSN/SAC
                        // ====================================================

                        let missingHSN =
                            rows.find(
                                r =>
                                    !r.gst_hsn_code ||
                                    !String(
                                        r.gst_hsn_code
                                    ).trim()
                            );


                        if (missingHSN) {

                            frappe.msgprint({

                                title:
                                    "HSN/SAC Required",

                                message:
                                    "HSN/SAC is required for every Item.",

                                indicator:
                                    "red"

                            });

                            return;

                        }


                        // ====================================================
                        // NORMALIZE ITEM MASTER VALUES
                        // ====================================================

                        rows.forEach(function (r) {

                            if (r.item_code) {

                                r.item_code =
                                    String(
                                        r.item_code
                                    ).trim();

                            }

                            if (r.item_group) {

                                r.item_group =
                                    String(
                                        r.item_group
                                    ).trim();

                            }

                            if (r.gst_hsn_code) {

                                r.gst_hsn_code =
                                    String(
                                        r.gst_hsn_code
                                    ).trim();

                            }

                        });


                        // ====================================================
                        // FIRST CREATE / CHECK ITEM MASTER
                        // ====================================================

                        frappe.dom.freeze(
                            "Checking / Creating Item Master..."
                        );


                        frappe.call({

                            method:
                                "pyro.api.ensure_pyro_items",

                            args: {

                                rows:
                                    JSON.stringify(
                                        rows
                                    )

                            },

                            callback:
                                function (res) {

                                    if (
                                        res.exc
                                    ) {

                                        frappe.dom.unfreeze();

                                        console.error(
                                            "Item creation error:",
                                            res.exc
                                        );

                                        frappe.msgprint({

                                            title:
                                                "Item Creation Failed",

                                            message:
                                                "Unable to create/check Item Master.<br><br>" +
                                                "Please check Error Log.",

                                            indicator:
                                                "red"

                                        });

                                        return;

                                    }


                                    let itemResults =
                                        res.message ||
                                        [];


                                    if (
                                        !Array.isArray(
                                            itemResults
                                        ) ||
                                        !itemResults.length
                                    ) {

                                        frappe.dom.unfreeze();

                                        frappe.msgprint({

                                            title:
                                                "Item Creation Failed",

                                            message:
                                                "No response received from Item Master.",

                                            indicator:
                                                "red"

                                        });

                                        return;

                                    }


                                    // ====================================================
                                    // VALIDATE ITEM MASTER RESPONSE
                                    // ====================================================

                                    let failed =
                                        itemResults.find(
                                            function (r) {

                                                return (
                                                    r.status !==
                                                        "created" &&
                                                    r.status !==
                                                        "existing"
                                                );

                                            }
                                        );


                                    if (failed) {

                                        frappe.dom.unfreeze();

                                        frappe.msgprint({

                                            title:
                                                "Item Creation Failed",

                                            message:
                                                "Unable to create/check Item: " +
                                                (
                                                    failed.item_code ||
                                                    ""
                                                ),

                                            indicator:
                                                "red"

                                        });

                                        return;

                                    }


                                    // ====================================================
                                    // UPDATE SALES ORDER TABLE
                                    // ====================================================

                                    frm.clear_table(
                                        child_fieldname
                                    );


                                    rows.forEach(
                                        function (r) {

                                            if (
                                                anchor_field &&
                                                !r[
                                                    anchor_field
                                                ]
                                            ) {
                                                return;
                                            }


                                            let row =
                                                frm.add_child(
                                                    child_fieldname
                                                );


                                            // columns.forEach(
                                            //     function (c) {

                                            //         if (
                                            //             c.item_master_only
                                            //         ) {

                                            //             return;

                                            //         }


                                            //         row[
                                            //             c.fieldname
                                            //         ] =
                                            //             r[
                                            //                 c.fieldname
                                            //             ];

                                            //     }
                                            // ); 
                                            columns.forEach(function (c) {
    if (c.item_master_only) {
        return;
    }

    let value = r[c.fieldname];

    if (c.fieldname === "delivery_date" && value) {
    if (
        typeof value === "string" &&
        /^\d{2}-\d{2}-\d{4}$/.test(value)
    ) {
        let parts = value.split("-");
        value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
}

    // Numeric fields
    if (
        c.fieldname === "qty" ||
        c.fieldname === "conversion_factor" ||
        c.fieldname === "amount"
    ) {
        value = parseFloat(value);

        if (isNaN(value)) {
            if (c.fieldname === "conversion_factor") {
                value = 1;
            } else {
                value = 0;
            }
        }
    }

    // Delivery Date
    if (c.fieldname === "delivery_date" && value) {

        // Excel date serial number
        if (typeof value === "number") {
            let excelDate = XLSX.SSF.parse_date_code(value);

            if (excelDate) {
                let month = String(excelDate.m).padStart(2, "0");
                let day = String(excelDate.d).padStart(2, "0");

                value = `${excelDate.y}-${month}-${day}`;
            }
        }

        // DD-MM-YYYY
        else if (
            typeof value === "string" &&
            /^\d{2}-\d{2}-\d{4}$/.test(value)
        ) {
            let parts = value.split("-");

            value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // DD/MM/YYYY
        else if (
            typeof value === "string" &&
            /^\d{2}\/\d{2}\/\d{4}$/.test(value)
        ) {
            let parts = value.split("/");

            value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    row[c.fieldname] = value;
});

                                            // ====================================================
                                            // FORCE ITEM CODE
                                            // ====================================================

                                            row.item_code =
                                                String(
                                                    r.item_code
                                                ).trim();


                                            // ====================================================
                                            // ITEM GROUP
                                            //
                                            // Do NOT put this into Sales Order
                                            // unless the child table actually has
                                            // this field.
                                            // ====================================================

                                            if (
                                                frappe.meta.has_field(
                                                    opts.child_doctype,
                                                    "item_group"
                                                )
                                            ) {

                                                row.item_group =
                                                    r.item_group;

                                            }


                                            // ====================================================
                                            // HSN/SAC
                                            //
                                            // Do NOT put this into Sales Order
                                            // unless the child table actually has
                                            // this field.
                                            // ====================================================

                                            if (
                                                frappe.meta.has_field(
                                                    opts.child_doctype,
                                                    "gst_hsn_code"
                                                )
                                            ) {

                                                row.gst_hsn_code =
                                                    r.gst_hsn_code;

                                            }

                                        }
                                    );


                                    frm.refresh_field(
                                        child_fieldname
                                    );


                                    frm.dirty();


                                    // ====================================================
                                    // GET ITEM DETAILS
                                    // ====================================================

                                    let itemPromises =
                                        rows.map(
                                            function (r) {

                                                return frappe.db
                                                    .get_value(
                                                        "Item",
                                                        r.item_code,
                                                        [
                                                            "item_name",
                                                            "stock_uom",
                                                            "item_group",
                                                            "gst_hsn_code"
                                                        ]
                                                    )
                                                    .then(
                                                        function (
                                                            response
                                                        ) {

                                                            return {

                                                                item_code:
                                                                    r.item_code,

                                                                data:
                                                                    response.message ||
                                                                    {}

                                                            };

                                                        }
                                                    );

                                            }
                                        );


                                    Promise.all(
                                        itemPromises
                                    )
                                        .then(
                                            function (
                                                itemDataList
                                            ) {

                                                let soItems =
                                                    frm.doc[
                                                        child_fieldname
                                                    ] || [];


                                                itemDataList.forEach(
                                                    function (
                                                        itemInfo,
                                                        index
                                                    ) {

                                                        let r =
                                                            rows[
                                                                index
                                                            ];


                                                        let soRow =
                                                            soItems.find(
                                                                function (
                                                                    child
                                                                ) {

                                                                    return (
                                                                        child.item_code ===
                                                                        r.item_code
                                                                    );

                                                                }
                                                            );


                                                        if (
                                                            !soRow
                                                        ) {
                                                            return;
                                                        }


                                                        let data =
                                                            itemInfo.data ||
                                                            {};


                                                        // Item Name

                                                        if (
                                                            data.item_name
                                                        ) {

                                                            soRow.item_name =
                                                                data.item_name;

                                                        }


                                                        // UOM

                                                        if (
                                                            data.stock_uom
                                                        ) {

                                                            soRow.stock_uom =
                                                                data.stock_uom;

                                                            soRow.uom =
                                                                data.stock_uom;

                                                        }


                                                        // Item Group

                                                        if (
                                                            frappe.meta.has_field(
                                                                opts.child_doctype,
                                                                "item_group"
                                                            ) &&
                                                            data.item_group
                                                        ) {

                                                            soRow.item_group =
                                                                data.item_group;

                                                        }


                                                        // HSN/SAC

                                                        if (
                                                            frappe.meta.has_field(
                                                                opts.child_doctype,
                                                                "gst_hsn_code"
                                                            ) &&
                                                            data.gst_hsn_code
                                                        ) {

                                                            soRow.gst_hsn_code =
                                                                data.gst_hsn_code;

                                                        }

                                                    }
                                                );


                                                // frm.refresh_field(
                                                //     child_fieldname
                                                // );


                                                // // ====================================================
                                                // // SAVE SALES ORDER
                                                // // ====================================================

                                                // let safetyTimeout =
                                                //     setTimeout(
                                                //         function () {

                                                //             frappe.dom.unfreeze();

                                                //         },
                                                //         15000
                                                //     );


                                                // frm.save()
                                                frm.refresh_field(
    child_fieldname
);

// FORCE NUMERIC VALUES
(frm.doc[child_fieldname] || []).forEach(function (item) {

    if (item.conversion_factor !== undefined) {
        item.conversion_factor = parseFloat(item.conversion_factor);

        if (
            isNaN(item.conversion_factor) ||
            item.conversion_factor <= 0
        ) {
            item.conversion_factor = 1;
        }
    }

    if (item.qty !== undefined) {
        item.qty = parseFloat(item.qty) || 0;
    }

    if (item.amount !== undefined) {
        item.amount = parseFloat(item.amount) || 0;
    }

});

frm.refresh_field(
    child_fieldname
);

// ====================================================
// SAVE SALES ORDER
// ====================================================

frm.save()
        // YOUR EXISTING CODE CONTINUES HERE

                                                    .then(
                                                        function () {

                                                            clearTimeout(
                                                                safetyTimeout
                                                            );


                                                            frappe.dom.unfreeze();


                                                            dialog.hide();


                                                            frappe.show_alert({

                                                                message:
                                                                    "Saved successfully",

                                                                indicator:
                                                                    "green"

                                                            });

                                                        }
                                                    )

                                                    .catch(
                                                        function (
                                                            err
                                                        ) {

                                                            clearTimeout(
                                                                safetyTimeout
                                                            );


                                                            frappe.dom.unfreeze();


                                                            console.error(
                                                                "Save error:",
                                                                err
                                                            );


                                                            frappe.msgprint({

                                                                title:
                                                                    "Save Failed",

                                                                message:
                                                                    "Sales Order could not be saved.<br><br>" +
                                                                    "Check the browser console and Error Log.",

                                                                indicator:
                                                                    "red"

                                                            });

                                                        }
                                                    );

                                            }
                                        )

                                        .catch(
                                            function (
                                                err
                                            ) {

                                                frappe.dom.unfreeze();

                                                console.error(
                                                    "Item detail error:",
                                                    err
                                                );

                                                frappe.msgprint({

                                                    title:
                                                        "Item Error",

                                                    message:
                                                        "Unable to read Item Master details.",

                                                    indicator:
                                                        "red"

                                                });

                                            }
                                        );

                                }

                        });

                    }

            });


        // ============================================================
        // GET ROWS
        // ============================================================

        // function getRowsFromTable() {

        //     let rows = [];


        //     dialog.$wrapper
        //         .find(
        //             "tbody tr"
        //         )
        //         .each(
        //             function () {

        //                 let row = {};


        //                 $(this)
        //                     .find(
        //                         "input.cell-input"
        //                     )
        //                     .each(
        //                         function () {

        //                             row[
        //                                 $(this).data(
        //                                     "fieldname"
        //                                 )
        //                             ] =
        //                                 $(this).val();

        //                         }
        //                     );


        //                 rows.push(
        //                     row
        //                 );

        //             }
        //         );


        //     return rows;

        // }
       
function getRowsFromTable() {

    let rows = [];

    // Fields that must be sent to ERPNext as numbers
    const numeric_fields = new Set([
        "qty",
        "conversion_factor",
        "amount",
        "custom_range_in_deg_c",
        "custom_design_temp_deg_c",
        "custom_design_pressure_kgcm2",
        "custom_route_length_rl_mm",
        "custom_lead_wire_length_in_mm",
        "custom_length_x_in_mm",
        "custom_immersion_length_e_mm",
        "custom_head_extension_length_n_mm",
        "custom_insertion_length_u_mm",
        "custom_well_extension_length_t_mm",
        "custom_total_thermowell_length_ut_mm",
        "custom_support_tube_length",
        "custom_expose_length",
        "custom_overall_length_olutn_mm",
        "custom_tw_root_end_od_b1_mm",
        "custom_tw_tip_end_od_b_mm"
    ]);

    dialog.$wrapper
        .find("tbody tr")
        .each(function () {

            let row = {};

            $(this)
                .find("input.cell-input")
                .each(function () {

                    let fieldname = $(this).data("fieldname");
                    let value = $(this).val();

                    // Convert numeric HTML input values from string to number
                    if (numeric_fields.has(fieldname)) {

                        value = parseFloat(value);

                        if (isNaN(value)) {

                            // ERPNext requires a valid conversion factor
                            if (fieldname === "conversion_factor") {
                                value = 1;
                            } else {
                                value = 0;
                            }
                        }
                    }

                    row[fieldname] = value;

                });

            rows.push(row);

        });

    return rows;
}


        // ============================================================
        // CELL INPUT
        // ============================================================

        function makeCellInput(
            c,
            val
        ) {

            val =
                val ||
                "";


            // --------------------------------------------------------
            // LINK
            // --------------------------------------------------------

            if (
                c.fieldtype ===
                "Link"
            ) {

                let listId =
                    "dl-" +
                    c.fieldname +
                    "-" +
                    frappe.utils.get_random(
                        6
                    );


                return `

                    <input
                        type="text"
                        list="${listId}"
                        class="cell-input form-control link-input"
                        data-fieldname="${c.fieldname}"
                        data-doctype="${c.options || ""}"
                        value="${frappe.utils.escape_html(val)}"
                        autocomplete="off"
                    >

                    <datalist
                        id="${listId}">
                    </datalist>

                `;

            }


            // --------------------------------------------------------
            // DATE
            // --------------------------------------------------------

            // if (
            //     c.fieldtype ===
            //     "Date"
            // ) {

            //     return `

            //         <input
            //             type="date"
            //             class="cell-input form-control"
            //             data-fieldname="${c.fieldname}"
            //             value="${frappe.utils.escape_html(val)}"
            //         >

            //     `;

            // }
            // --------------------------------------------------------
// DATE
// --------------------------------------------------------

if (c.fieldtype === "Date") {

    let dateValue = val || "";

    // Excel serial date
    if (
        typeof dateValue === "number" &&
        !isNaN(dateValue)
    ) {
        let parsed = XLSX.SSF.parse_date_code(dateValue);

        if (parsed) {
            dateValue =
                String(parsed.d).padStart(2, "0") + "-" +
                String(parsed.m).padStart(2, "0") + "-" +
                String(parsed.y);
        }
    }

    // YYYY-MM-DD -> DD-MM-YYYY
    else if (
        typeof dateValue === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ) {
        let parts = dateValue.split("-");

        dateValue =
            parts[2] + "-" +
            parts[1] + "-" +
            parts[0];
    }

    return `
        <input
            type="text"
            class="cell-input form-control"
            data-fieldname="${c.fieldname}"
            placeholder="dd-mm-yyyy"
            value="${frappe.utils.escape_html(dateValue)}"
        >
    `;
}


            // --------------------------------------------------------
            // FLOAT / INT
            // --------------------------------------------------------

            if (
                c.fieldtype === "Float" ||
                c.fieldtype === "Int"
            ) {

                return `

                    <input
                        type="number"
                        step="any"
                        class="cell-input form-control"
                        data-fieldname="${c.fieldname}"
                        value="${frappe.utils.escape_html(val)}"
                    >

                `;

            }


            // --------------------------------------------------------
            // DEFAULT DATA
            // --------------------------------------------------------

            return `

                <input
                    type="text"
                    class="cell-input form-control"
                    data-fieldname="${c.fieldname}"
                    value="${frappe.utils.escape_html(val)}"
                >

            `;

        }


        // ============================================================
        // RENDER TABLE
        // ============================================================

        function renderTable(
            data
        ) {

            let headerCells = `

                <th
                    style="min-width:40px;"
                >
                    <input
                        type="checkbox"
                        id="select-all-cb"
                    >
                </th>

            `;


            columns.forEach(
                function (c) {

                    headerCells += `

                        <th
                            style="
                                min-width:150px;
                                padding:6px;
                                white-space:nowrap;
                            "
                        >
                            ${c.label}
                        </th>

                    `;

                }
            );


            let bodyRows =
                "";


            data.forEach(
                function (rowData) {

                    bodyRows +=
                        `<tr>`;


                    bodyRows += `

                        <td>
                            <input
                                type="checkbox"
                                class="row-select-cb"
                            >
                        </td>

                    `;


                    columns.forEach(
                        function (c) {

                            bodyRows += `

                                <td>
                                    ${makeCellInput(
                                        c,
                                        rowData[
                                            c.fieldname
                                        ]
                                    )}
                                </td>

                            `;

                        }
                    );


                    bodyRows +=
                        `</tr>`;

                }
            );


            let html = `

                <div
                    style="
                        margin-bottom:8px;
                        display:flex;
                        gap:6px;
                        flex-wrap:wrap;
                    "
                >

                    <button
                        class="btn btn-sm btn-default"
                        id="add-row-btn"
                    >
                        + Add Row
                    </button>


                    <button
                        class="btn btn-sm btn-danger"
                        id="delete-row-btn"
                    >
                        Delete Selected
                    </button>


                    <button
                        class="btn btn-sm btn-default"
                        id="upload-btn"
                    >
                        Upload Excel
                    </button>


                    <button
                        class="btn btn-sm btn-default"
                        id="export-btn"
                    >
                        Download Excel Template
                    </button>


                    <input
                        type="file"
                        id="excel-file-input"
                        accept=".xlsx,.xls"
                        style="display:none;"
                    >

                </div>


                <div
                    style="
                        overflow-x:auto;
                        max-width:100%;
                        border:1px solid #d1d8dd;
                    "
                >

                    <table
                        class="table table-bordered"
                        style="margin-bottom:0;"
                    >

                        <thead
                            style="background:#f5f7fa;"
                        >

                            <tr>
                                ${headerCells}
                            </tr>

                        </thead>


                        <tbody>
                            ${bodyRows}
                        </tbody>

                    </table>

                </div>

            `;


            dialog.fields_dict
                .table_html
                .$wrapper
                .html(
                    html
                );


            bindEvents();

            bindLinkAutocomplete();

        }


        // ============================================================
        // FETCH LINK OPTIONS
        // ============================================================

        function fetchLinkOptions(
            $input
        ) {

            let doctype =
                $input.data(
                    "doctype"
                );


            let listId =
                $input.attr(
                    "list"
                );


            let txt =
                $input.val();


            if (!doctype) {
                return;
            }


            frappe.call({

                method:
                    "frappe.desk.search.search_link",

                args: {

                    doctype:
                        doctype,

                    txt:
                        txt || ""

                },

                callback:
                    function (r) {

                        let options =
                            r.message ||
                            [];


                        let $datalist =
                            dialog.$wrapper.find(
                                "#" +
                                listId
                            );


                        $datalist.empty();


                        options.forEach(
                            function (o) {

                                $datalist.append(`

                                    <option
                                        value="${frappe.utils.escape_html(
                                            o.value
                                        )}"
                                    >
                                        ${frappe.utils.escape_html(
                                            o.description ||
                                            ""
                                        )}
                                    </option>

                                `);

                            }
                        );

                    }

            });

        }


        // ============================================================
        // LINK AUTOCOMPLETE
        // ============================================================

        function bindLinkAutocomplete() {

            dialog.$wrapper
                .find(
                    ".link-input"
                )
                .off(
                    "focus"
                )
                .on(
                    "focus",
                    function () {

                        fetchLinkOptions(
                            $(this)
                        );

                    }
                );


            dialog.$wrapper
                .find(
                    ".link-input"
                )
                .off(
                    "input"
                )
                .on(
                    "input",
                    frappe.utils.debounce(
                        function () {

                            fetchLinkOptions(
                                $(this)
                            );

                        },
                        300
                    )
                );


            // ========================================================
            // ITEM CODE CHANGE
            // ========================================================

            if (
                has_item_lookup
            ) {

                dialog.$wrapper
                    .find(
                        "input[data-fieldname='item_code']"
                    )
                    .off(
                        "change"
                    )
                    .on(
                        "change",
                        function () {

                            let $row =
                                $(this)
                                    .closest(
                                        "tr"
                                    );


                            let itemCode =
                                $(this)
                                    .val();


                            if (
                                !itemCode
                            ) {
                                return;
                            }


                            frappe.db
                                .get_value(

                                    "Item",

                                    itemCode,

                                    [
                                        "item_name",
                                        "stock_uom",
                                        "item_group",
                                        "gst_hsn_code"
                                    ]

                                )
                                .then(
                                    function (r) {

                                        if (
                                            !r.message
                                        ) {
                                            return;
                                        }


                                        if (
                                            r.message.item_name
                                        ) {

                                            $row
                                                .find(
                                                    "input[data-fieldname='item_name']"
                                                )
                                                .val(
                                                    r.message.item_name
                                                );

                                        }


                                        if (
                                            r.message.stock_uom
                                        ) {

                                            $row
                                                .find(
                                                    "input[data-fieldname='uom']"
                                                )
                                                .val(
                                                    r.message.stock_uom
                                                );

                                        }


                                        if (
                                            r.message.item_group
                                        ) {

                                            $row
                                                .find(
                                                    "input[data-fieldname='item_group']"
                                                )
                                                .val(
                                                    r.message.item_group
                                                );

                                        }


                                        if (
                                            r.message.gst_hsn_code
                                        ) {

                                            $row
                                                .find(
                                                    "input[data-fieldname='gst_hsn_code']"
                                                )
                                                .val(
                                                    r.message.gst_hsn_code
                                                );

                                        }

                                    }
                                );

                        }
                    );

            }

        }


        // ============================================================
        // EVENTS
        // ============================================================

        function bindEvents() {

            let $wrap =
                dialog.fields_dict
                    .table_html
                    .$wrapper;


            // ========================================================
            // ADD ROW
            // ========================================================

            $wrap
                .find(
                    "#add-row-btn"
                )
                .off(
                    "click"
                )
                .on(
                    "click",
                    function () {

                        let cellsHtml = `

                            <td>
                                <input
                                    type="checkbox"
                                    class="row-select-cb"
                                >
                            </td>

                        `;


                        columns.forEach(
                            function (c) {

                                cellsHtml += `

                                    <td>
                                        ${makeCellInput(
                                            c,
                                            ""
                                        )}
                                    </td>

                                `;

                            }
                        );


                        $wrap
                            .find(
                                "tbody"
                            )
                            .append(
                                `<tr>${cellsHtml}</tr>`
                            );


                        bindLinkAutocomplete();

                    }
                );


            // ========================================================
            // DELETE ROW
            // ========================================================

            $wrap
                .find(
                    "#delete-row-btn"
                )
                .off(
                    "click"
                )
                .on(
                    "click",
                    function () {

                        $wrap
                            .find(
                                "tbody tr"
                            )
                            .each(
                                function () {

                                    if (
                                        $(this)
                                            .find(
                                                ".row-select-cb"
                                            )
                                            .is(
                                                ":checked"
                                            )
                                    ) {

                                        $(this).remove();

                                    }

                                }
                            );

                    }
                );


            // ========================================================
            // SELECT ALL
            // ========================================================

            $wrap
                .find(
                    "#select-all-cb"
                )
                .off(
                    "click"
                )
                .on(
                    "click",
                    function () {

                        let checked =
                            $(this)
                                .is(
                                    ":checked"
                                );


                        $wrap
                            .find(
                                ".row-select-cb"
                            )
                            .prop(
                                "checked",
                                checked
                            );

                    }
                );


            // ========================================================
            // UPLOAD
            // ========================================================

            $wrap
                .find(
                    "#upload-btn"
                )
                .off(
                    "click"
                )
                .on(
                    "click",
                    function () {

                        $wrap
                            .find(
                                "#excel-file-input"
                            )
                            .trigger(
                                "click"
                            );

                    }
                );


            // ========================================================
            // EXCEL UPLOAD
            // ========================================================

            $wrap
                .find(
                    "#excel-file-input"
                )
                .off(
                    "change"
                )
                .on(
                    "change",
                    function (e) {

                        let file =
                            e.target.files[0];


                        if (!file) {
                            return;
                        }


                        frappe.require(

                            "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",

                            function () {

                                let reader =
                                    new FileReader();


                                reader.onload =
                                    function (
                                        evt
                                    ) {

                                        let wb =
                                            XLSX.read(
                                                evt.target.result,
                                                {
                                                    type:
                                                        "array",
                                                        cellDates: true

                                                }
                                            );


                                        let sheet =
                                            wb.Sheets[
                                                wb.SheetNames[0]
                                            ];


                                        let aoa =
                                            XLSX.utils.sheet_to_json(
                                                sheet,
                                                {
                                                    header:
                                                        1,
                                                    defval:
                                                        ""
                                                }
                                            );


                                        // ====================================================
                                        // FIELDNAME ROW = ROW 3
                                        // ====================================================

                                        // let fieldnameRow =
                                        //     aoa[2] ||
                                        //     [];


                                        // let dataStartIdx =
                                        //     -1;


                                        // // ====================================================
                                        // // FIND ------ ROW
                                        // // ====================================================

                                        // for (
                                        //     let i = 0;
                                        //     i < aoa.length;
                                        //     i++
                                        // ) {

                                        //     if (

                                        //         aoa[i][0] &&

                                        //         aoa[i][0]
                                        //             .toString()
                                        //             .trim()
                                        //             .startsWith(
                                        //                 "---"
                                        //             )

                                        //     ) {

                                        //         dataStartIdx =
                                        //             i + 1;

                                        //         break;

                                        //     }

                                        // }


                                        // if (
                                        //     dataStartIdx ===
                                        //     -1
                                        // ) {

                                        //     dataStartIdx =
                                        //         8;

                                        // }

                                        // ====================================================
// FIND FIELDNAME ROW DYNAMICALLY
// ====================================================

let fieldnameRow = [];
let fieldnameRowIndex = -1;

for (let i = 0; i < aoa.length; i++) {

    let testRow = aoa[i] || [];

    if (
        testRow.some(function (value) {
            return String(value || "").trim() === "item_code";
        })
    ) {

        fieldnameRow = testRow;
        fieldnameRowIndex = i;

        break;
    }
}

if (fieldnameRowIndex === -1) {

    frappe.msgprint({
        title: "Invalid Excel Format",
        message:
            "Fieldname row not found. Please make sure the Excel contains 'item_code'.",
        indicator: "red"
    });

    return;
}


// ====================================================
// FIND DATA START ROW
// ====================================================

let dataStartIdx = -1;


// ----------------------------------------------------
// FORMAT 1: PYRO GENERATED TEMPLATE
// Has ------ separator
// ----------------------------------------------------

for (
    let i = fieldnameRowIndex + 1;
    i < aoa.length;
    i++
) {

    if (
        aoa[i][0] &&
        String(aoa[i][0])
            .trim()
            .startsWith("---")
    ) {

        dataStartIdx = i + 1;
        break;
    }
}


// ----------------------------------------------------
// FORMAT 2: NORMAL EXCEL
// No ------ separator
// Data starts immediately after fieldname row
// ----------------------------------------------------

if (dataStartIdx === -1) {

    dataStartIdx =
        fieldnameRowIndex + 1;
}


                                        // ====================================================
                                        // MAP EXCEL USING FIELDNAME ROW
                                        // ====================================================

//                                         let mappedRows =
//                                             [];


//                                         for (
//                                             let i =
//                                                 dataStartIdx;

//                                             i <
//                                             aoa.length;

//                                             i++
//                                         ) {

//                                             let rawRow =
//                                                 aoa[i];


//                                             if (
//                                                 !rawRow ||
//                                                 rawRow.every(
//                                                     v =>
//                                                         v ===
//                                                         "" ||
//                                                         v ===
//                                                         undefined
//                                                 )
//                                             ) {

//                                                 continue;

//                                             }


//                                             let row =
//                                                 {};


//                                             fieldnameRow.forEach(
//     function (fname, colIdx) {

//         if (!fname) {
//             return;
//         }

//         let value =
//             rawRow[colIdx] !== undefined
//                 ? rawRow[colIdx]
//                 : "";

//         // ==========================================
//         // DELIVERY DATE
//         // ==========================================
//         if (fname === "delivery_date" && value) {

//             // Excel serial number
//             if (typeof value === "number") {

//                 let parsed =
//                     XLSX.SSF.parse_date_code(value);

//                 if (parsed) {

//                     let month =
//                         String(parsed.m).padStart(2, "0");

//                     let day =
//                         String(parsed.d).padStart(2, "0");

//                     value =
//                         `${parsed.y}-${month}-${day}`;
//                 }
//             }

//             // JavaScript Date
//             else if (
//                 value instanceof Date &&
//                 !isNaN(value)
//             ) {

//                 let year =
//                     value.getFullYear();

//                 let month =
//                     String(
//                         value.getMonth() + 1
//                     ).padStart(2, "0");

//                 let day =
//                     String(
//                         value.getDate()
//                     ).padStart(2, "0");

//                 value =
//                     `${year}-${month}-${day}`;
//             }

//             // DD-MM-YYYY
//             else if (
//                 typeof value === "string" &&
//                 /^\d{2}-\d{2}-\d{4}$/.test(value)
//             ) {

//                 let parts =
//                     value.split("-");

//                 value =
//                     `${parts[2]}-${parts[1]}-${parts[0]}`;
//             }

//             // DD/MM/YYYY
//             else if (
//                 typeof value === "string" &&
//                 /^\d{2}\/\d{2}\/\d{4}$/.test(value)
//             ) {

//                 let parts =
//                     value.split("/");

//                 value =
//                     `${parts[2]}-${parts[1]}-${parts[0]}`;
//             }
//         }

//         row[fname] = value;

//     }
// );
//             // ====================================================
// // ONLY MAP REAL ITEM DATA ROWS
// // ====================================================

// let excelItemCode =
//     String(row.item_code || "").trim();

// let excelItemName =
//     String(row.item_name || "").trim();

// if (
//     excelItemCode &&
//     excelItemName
// ) {
//     mappedRows.push(row);
// }

//                                         }


//                                         // ====================================================
//                                         // RENDER
//                                         // ====================================================

//                                         renderTable(

//                                             mappedRows.length
//                                                 ? mappedRows
//                                                 : [{}]

//                                         );
                                        // ====================================================
// MAP EXCEL - ONLY ACTUAL ITEM ROWS
// ====================================================

let mappedRows = [];

let itemCodeCol = fieldnameRow.indexOf("item_code");
let itemNameCol = fieldnameRow.indexOf("item_name");

if (itemCodeCol === -1 || itemNameCol === -1) {
    frappe.msgprint({
        title: "Invalid Excel",
        message: "item_code or item_name field not found.",
        indicator: "red"
    });
    return;
}

for (let i = dataStartIdx; i < aoa.length; i++) {

    let rawRow = aoa[i] || [];

    // ------------------------------------------------
    // CHECK RAW EXCEL VALUES FIRST
    // ------------------------------------------------

    let itemCode = String(
        rawRow[itemCodeCol] ?? ""
    ).trim();

    let itemName = String(
        rawRow[itemNameCol] ?? ""
    ).trim();


    // ------------------------------------------------
    // IGNORE EVERYTHING THAT IS NOT AN ITEM
    // ------------------------------------------------

    if (!itemCode || !itemName) {
        continue;
    }


    // ------------------------------------------------
    // CREATE ROW ONLY AFTER VALIDATION
    // ------------------------------------------------

    let row = {};

    fieldnameRow.forEach(function (fname, colIdx) {

        if (!fname) {
            return;
        }

        let value =
            rawRow[colIdx] !== undefined
                ? rawRow[colIdx]
                : "";


        // DELIVERY DATE
        if (
            fname === "delivery_date" &&
            value
        ) {

            if (
                typeof value === "number"
            ) {

                let parsed =
                    XLSX.SSF.parse_date_code(value);

                if (parsed) {

                    value =
                        `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;

                }

            }

            else if (
                value instanceof Date &&
                !isNaN(value)
            ) {

                value =
                    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

            }

            else if (
                typeof value === "string" &&
                /^\d{2}-\d{2}-\d{4}$/.test(value)
            ) {

                let parts = value.split("-");

                value =
                    `${parts[2]}-${parts[1]}-${parts[0]}`;

            }

            else if (
                typeof value === "string" &&
                /^\d{2}\/\d{2}\/\d{4}$/.test(value)
            ) {

                let parts = value.split("/");

                value =
                    `${parts[2]}-${parts[1]}-${parts[0]}`;

            }

        }

        row[fname] = value;

    });


    // ------------------------------------------------
    // FINAL CHECK AGAIN
    // ------------------------------------------------

    if (
        String(row.item_code || "").trim() &&
        String(row.item_name || "").trim()
    ) {

        mappedRows.push(row);

    }

}


// ====================================================
// RENDER ONLY ACTUAL ITEMS
// ====================================================

console.log(
    "EXCEL ROWS FOUND:",
    mappedRows
);

console.log(
    "EXCEL ITEM COUNT:",
    mappedRows.length
);

renderTable(mappedRows);


                                        frappe.show_alert({

                                            message:
                                                "Excel data loaded",

                                            indicator:
                                                "green"

                                        });

                                    };


                                reader.readAsArrayBuffer(
                                    file
                                );

                            }

                        );

                    }
                );


            // ========================================================
            // EXPORT EXCEL
            // ========================================================

            $wrap
                .find(
                    "#export-btn"
                )
                .off(
                    "click"
                )
                .on(
                    "click",
                    function () {

                        frappe.require(

                            "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",

                            function () {

                                let currentRows =
                                    getRowsFromTable()
                                        .filter(
                                            r =>
                                                !anchor_field ||
                                                r[
                                                    anchor_field
                                                ]
                                        );


                                let aoa =
                                    [];


                                // Row 1

                                aoa.push([

                                    "Pyro Template - " +
                                    opts.template_name

                                ]);


                                // Row 2 - labels

                                aoa.push(

                                    columns.map(
                                        c =>
                                            c.label
                                    )

                                );


                                // Row 3 - FIELDNAMES

                                aoa.push(

                                    columns.map(
                                        c =>
                                            c.fieldname
                                    )

                                );


                                // Row 4 - format

                                aoa.push(

                                    columns.map(
                                        c =>
                                            c.fieldtype ===
                                            "Date"

                                                ? "dd-mm-yyyy"

                                                : ""
                                    )

                                );


                                aoa.push([]);


                                aoa.push([

                                    "Fill data in the rows below. Do not edit the header rows above."

                                ]);


                                aoa.push([

                                    "Do not remove or reorder the fieldname row (row 3)."

                                ]);


                                aoa.push([

                                    "------"

                                ]);


                                // ====================================================
                                // DATA
                                // ====================================================

                                if (
                                    currentRows.length
                                ) {

                                    currentRows.forEach(
                                        function (
                                            r
                                        ) {

                                            aoa.push(

                                                columns.map(
                                                    function (
                                                        c
                                                    ) {

                                                        return (
                                                            r[
                                                                c.fieldname
                                                            ] ||
                                                            ""
                                                        );

                                                    }
                                                )

                                            );

                                        }
                                    );

                                }
                                else {

                                    aoa.push(

                                        columns.map(
                                            () =>
                                                ""
                                        )

                                    );

                                }


                                let ws =
                                    XLSX.utils.aoa_to_sheet(
                                        aoa
                                    );


                                ws["!cols"] =
                                    columns.map(
                                        () =>
                                            ({
                                                wch:
                                                    20
                                            })
                                    );


                                let wb =
                                    XLSX.utils.book_new();


                                XLSX.utils.book_append_sheet(

                                    wb,

                                    ws,

                                    "Items"

                                );


                                XLSX.writeFile(

                                    wb,

                                    "pyro_template_" +
                                    opts.template_name +
                                    ".xlsx"

                                );

                            }

                        );

                    }
                );

        }


        // ============================================================
        // INITIAL TABLE
        // ============================================================

        // renderTable(

        //     existingData.length
        //         ? existingData
        //         : [{}]

        // );
        // ====================================================
// FINAL FILTER - ONLY REAL ITEM ROWS
// ====================================================

mappedRows = mappedRows.filter(function (row) {

    let itemCode =
        String(row.item_code || "").trim();

    let itemName =
        String(row.item_name || "").trim();

    // ONLY rows having BOTH Item Code and Item Name
    return (
        itemCode !== "" &&
        itemName !== ""
    );

});


// ====================================================
// DEBUG
// ====================================================

console.log(
    "FINAL MAPPED ITEM ROWS:",
    mappedRows
);

console.log(
    "FINAL ITEM COUNT:",
    mappedRows.length
);


// ====================================================
// RENDER ONLY REAL ITEMS
// ====================================================

renderTable(
    mappedRows.length
        ? mappedRows
        : [{}]
);

frappe.show_alert({

    message:
        mappedRows.length +
        " real item(s) loaded from Excel",

    indicator:
        "green"

});


        dialog.$wrapper
            .find(
                ".modal-dialog"
            )
            .css(
                "max-width",
                "95vw"
            );


        dialog.show();

    }

};