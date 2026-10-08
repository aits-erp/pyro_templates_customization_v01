window.pyro = window.pyro || {};

pyro.bulk_edit = {

    // ============================================================
    // OPEN
    // ============================================================

    open: function (frm, opts) {
        if (!frm.doc.delivery_date) {
            frappe.msgprint({
                title: __("Delivery Date Required"),
                message: __("Please select Sales Order Delivery Date before loading/uploading Pyro items."),
                indicator: "red"
            });
            return;
        }

        frappe.call({

            method: "pyro.api.get_doctype_fields",

            args: {
                doctype: opts.child_doctype
            },

            callback: function (res) {

                let allFields = res.message || [];

                let mandatoryFields = allFields.filter(f => f.reqd);

                frappe.db
                    .get_doc("Pyro Series Config", opts.template_name)
                    .then(function (templateDoc) {

                        let includedCustom = (templateDoc.fields_table || []).filter(f => f.include);

                        let seen = {};
                        let columns = [];

                        // ====================================================
                        // MANDATORY SALES ORDER ITEM FIELDS
                        // ====================================================

                        mandatoryFields.forEach(function (f) {

                            columns.push({
                                fieldname: f.fieldname,
                                label: f.label,
                                fieldtype: f.fieldtype,
                                options: f.options
                            });

                            seen[f.fieldname] = true;
                        });

                        // ====================================================
                        // CONFIGURED PYRO FIELDS
                        // ====================================================

                        includedCustom.forEach(function (f) {

                            if (!seen[f.fieldname]) {

                                columns.push({
                                    fieldname: f.fieldname,
                                    label: f.label,
                                    fieldtype: f.field_type,
                                    options: f.options
                                });

                                seen[f.fieldname] = true;
                            }
                        });

                        // ====================================================
                        // OPEN TABLE
                        // ====================================================

                        pyro.bulk_edit._render(frm, columns, opts);
                    });
            }
        });
    },


    // ============================================================
    // RENDER
    // ============================================================

    // _render: function (frm, columns, opts) {

    //     let child_fieldname = opts.child_fieldname;

    //     let anchor_field = columns[0] ? columns[0].fieldname : null;
    _render: function (frm, columns, opts) {

    // ============================================================
    // PRESERVE SALES ORDER HEADER DELIVERY DATE
    // Capture it ONCE before any Excel/item processing
    // ============================================================

    const originalSalesOrderDeliveryDate =
        frm.doc.delivery_date;

    console.log(
        "Original Sales Order Delivery Date:",
        originalSalesOrderDeliveryDate
    );


    let child_fieldname = opts.child_fieldname;

    let anchor_field =
        columns[0] ? columns[0].fieldname : null;

        let has_item_lookup = columns.some(
            c => c.fieldname === "item_code" && c.options === "Item"
        );

        let existingData = (frm.doc[child_fieldname] || []).map(r => ({ ...r }));

        // ============================================================
// DELIVERY DATE NORMALIZER
// User display format: dd-mm-yyyy
// ERPNext internal format: yyyy-mm-dd
// ============================================================

// function normalizeDeliveryDate(value) {

//     if (
//         value === undefined ||
//         value === null ||
//         value === ""
//     ) {
//         return "";
//     }

//     function buildValidDate(year, month, day) {

//         year = parseInt(year, 10);
//         month = parseInt(month, 10);
//         day = parseInt(day, 10);

//         if (
//             isNaN(year) ||
//             isNaN(month) ||
//             isNaN(day)
//         ) {
//             return "";
//         }

//         let d = new Date(year, month - 1, day);

//         // Reject invalid date like 31-02-2026
//         if (
//             d.getFullYear() !== year ||
//             d.getMonth() !== month - 1 ||
//             d.getDate() !== day
//         ) {
//             return "";
//         }

//         return (
//             String(year).padStart(4, "0") +
//             "-" +
//             String(month).padStart(2, "0") +
//             "-" +
//             String(day).padStart(2, "0")
//         );
//     }

//     // Excel / JavaScript Date object
//     if (
//         value instanceof Date &&
//         !isNaN(value.getTime())
//     ) {

//         return buildValidDate(
//             value.getFullYear(),
//             value.getMonth() + 1,
//             value.getDate()
//         );
//     }

//     // Excel serial number
//     if (
//         typeof value === "number" &&
//         window.XLSX &&
//         XLSX.SSF
//     ) {

//         let parsed = XLSX.SSF.parse_date_code(value);

//         if (parsed) {

//             return buildValidDate(
//                 parsed.y,
//                 parsed.m,
//                 parsed.d
//             );
//         }
//     }

//     let text = String(value).trim();

//     if (!text) {
//         return "";
//     }

//     let match;

//     // DD-MM-YYYY
//     // DD/MM/YYYY
//     // DD.MM.YYYY
//     // DD MM YYYY
//     match = text.match(
//         /^(\d{1,2})[-\/.\s](\d{1,2})[-\/.\s](\d{4})$/
//     );

//     if (match) {

//         return buildValidDate(
//             match[3],
//             match[2],
//             match[1]
//         );
//     }

//     // YYYY-MM-DD
//     // YYYY/MM/DD
//     // YYYY.MM.DD
//     match = text.match(
//         /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/
//     );

//     if (match) {

//         return buildValidDate(
//             match[1],
//             match[2],
//             match[3]
//         );
//     }

//     return "";
// }

function normalizeDeliveryDate(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return "";
    }

    function buildValidDate(year, month, day) {

        year = parseInt(year, 10);
        month = parseInt(month, 10);
        day = parseInt(day, 10);

        if (
            isNaN(year) ||
            isNaN(month) ||
            isNaN(day)
        ) {
            return "";
        }

        // Month must be 1 to 12
        if (month < 1 || month > 12) {
            return "";
        }

        let d = new Date(
            year,
            month - 1,
            day
        );

        // Reject invalid dates like 31-02-2026
        if (
            d.getFullYear() !== year ||
            d.getMonth() !== month - 1 ||
            d.getDate() !== day
        ) {
            return "";
        }

        return (
            String(year).padStart(4, "0") +
            "-" +
            String(month).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0")
        );
    }


    // If Excel already converted the value to a numeric date serial,
    // do not guess DD/MM vs MM/DD.
    if (typeof value === "number") {
        return "__EXCEL_DATE_SERIAL__";
    }


    // If Excel / SheetJS gives a JavaScript Date object,
    // do not guess the original typed format.
    if (
        value instanceof Date &&
        !isNaN(value.getTime())
    ) {
        return "__EXCEL_DATE_SERIAL__";
    }


    let text = String(value).trim();


    // ============================================================
    // USER INPUT FORMAT
    // Always interpret as:
    //
    // DD-MM-YYYY
    // DD/MM/YYYY
    // DD.MM.YYYY
    // DD MM YYYY
    // ============================================================

    // let match = text.match(
    //     /^(\d{1,2})[-\/.\s](\d{1,2})[-\/.\s](\d{4})$/
    // );

    // if (match) {

    //     let day = match[1];
    //     let month = match[2];
    //     let year = match[3];

    //     return buildValidDate(
    //         year,
    //         month,
    //         day
    //     );
    // }

    // DD-MM-YYYY
// DD/MM/YYYY
// DD.MM.YYYY
// DD MM YYYY

let parts = text.split(/[-\/.\s]+/);

if (
    parts.length === 3 &&
    /^\d{1,2}$/.test(parts[0]) &&
    /^\d{1,2}$/.test(parts[1]) &&
    /^\d{4}$/.test(parts[2])
) {

    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    return buildValidDate(
        year,
        month,
        day
    );
}


    // ============================================================
    // ERPNext internal format
    // YYYY-MM-DD
    // ============================================================

    match = text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

    if (match) {

        return buildValidDate(
            match[1],
            match[2],
            match[3]
        );
    }


    return "__INVALID_DATE__";
}

        let dialog = new frappe.ui.Dialog({

            title: frm.doc.doctype + " Items - " + opts.template_name,

            size: "extra-large",

            fields: [
                {
                    fieldname: "table_html",
                    fieldtype: "HTML"
                }
            ],

            primary_action_label: "Save",

            primary_action: function () {

    let rows = getRowsFromTable();
    // let originalSalesOrderDeliveryDate = frm.doc.delivery_date;
    // ====================================================
    // BASIC VALIDATION
    // ====================================================

    if (!anchor_field || !rows.some(r => r[anchor_field])) {

        frappe.msgprint(
            `Enter at least one row with a valid ${anchor_field || "key field"}`
        );

        return;
    }


    // ====================================================
    // REMOVE EMPTY ROWS
    // ====================================================

    rows = rows.filter(function (r) {

        return (
            r[anchor_field] !== undefined &&
            String(r[anchor_field] || "").trim() !== ""
        );
    });


    if (!rows.length) {

        frappe.msgprint(
            "Please enter at least one Item Code."
        );

        return;
    }


    // ====================================================
    // ITEM CODE REQUIRED
    // ====================================================

    let missingItemCode = rows.find(
        r =>
            !r.item_code ||
            !String(r.item_code).trim()
    );


    if (missingItemCode) {

        frappe.msgprint({

            title: "Item Code Required",

            message:
                "Item Code is required for every row.",

            indicator: "red"
        });

        return;
    }


    // ====================================================
    // NORMALIZE ROW VALUES
    // ====================================================

    rows.forEach(function (r) {

        if (r.item_code) {

            r.item_code =
                String(r.item_code).trim();
        }

        // Delivery date:
        // item date first,
        // Sales Order default second.
        if (r.delivery_date) {

                r.delivery_date =
                    normalizeDeliveryDate(
                        r.delivery_date
                    );
            }

            if (!r.delivery_date) {

                r.delivery_date =
                    originalSalesOrderDeliveryDate;
            }
    });


    try {

        // ====================================================
        // BUILD SALES ORDER CHILD ROWS FIRST
        // Do not freeze UI before this section.
        // ====================================================

        frm.clear_table(child_fieldname);


        rows.forEach(function (r) {

            if (
                anchor_field &&
                !r[anchor_field]
            ) {
                return;
            }


            let row =
                frm.add_child(child_fieldname);


            columns.forEach(function (c) {

                let value =
                    r[c.fieldname];


                // ============================================
                // NUMERIC FIELDS
                // ============================================

                if (
                    c.fieldname === "qty" ||
                    c.fieldname === "conversion_factor" ||
                    c.fieldname === "amount"
                ) {

                    value =
                        parseFloat(value);

                    if (isNaN(value)) {

                        value =
                            c.fieldname ===
                            "conversion_factor"
                                ? 1
                                : 0;
                    }
                }


                // ============================================
                // DELIVERY DATE
                // ============================================

                if (
                    c.fieldname ===
                    "delivery_date"
                ) {
            //                     console.log(
            //     "EXCEL DELIVERY DATE:",
            //     "Row:", i + 1,
            //     "Raw:", value,
            //     "Displayed:", displayedDate,
            //     "Cell:", excelCell
            // );

                    let normalizedDate =
                        normalizeDeliveryDate(
                            value
                        );

                    row[c.fieldname] =
                    normalizedDate ||
                    originalSalesOrderDeliveryDate;

                } else {

                    row[c.fieldname] =
                        value;
                }
            });


            // Always keep Item Code
            row.item_code =
                String(r.item_code).trim();


            // Item Group
            if (
                frappe.meta.has_field(
                    opts.child_doctype,
                    "item_group"
                )
            ) {

                row.item_group =
                    r.item_group;
            }


            // HSN
            if (
                frappe.meta.has_field(
                    opts.child_doctype,
                    "gst_hsn_code"
                )
            ) {

                row.gst_hsn_code =
                    r.gst_hsn_code;
            }

        });


        frm.refresh_field(
            child_fieldname
        );

        frm.dirty();

    } catch (err) {

        console.error(
            "Row processing error:",
            err
        );

        frappe.msgprint({

            title: "Item Processing Error",

            message:
                err.message ||
                "Unable to process uploaded items.",

            indicator: "red"
        });

        return;
    }


    // ====================================================
    // NOW FREEZE
    // Everything above already passed without JS error.
    // ====================================================

    frappe.dom.freeze(
        "Saving Items..."
    );


    // ====================================================
    // GET UNIQUE ITEM CODES
    // ====================================================

    let uniqueItemCodes =
        [...new Set(
            rows.map(
                r => r.item_code
            )
        )];


    // ====================================================
    // ONE SERVER REQUEST INSTEAD OF
    // ONE REQUEST FOR EVERY ROW
    // ====================================================

    frappe.call({

        method:
            "frappe.client.get_list",

        args: {

            doctype: "Item",

            fields: [
                "name",
                "item_name",
                "stock_uom",
                "item_group",
                "gst_hsn_code"
            ],

            filters: [
                [
                    "name",
                    "in",
                    uniqueItemCodes
                ]
            ],

            limit_page_length:
                Math.max(
                    uniqueItemCodes.length,
                    20
                )
        },

        callback: function (response) {

            try {

                let itemList =
                    response.message || [];


                // ============================================
                // CREATE ITEM LOOKUP MAP
                // ============================================

                let itemMap = {};

                itemList.forEach(
                    function (item) {

                        itemMap[item.name] =
                            item;
                    }
                );


                let soItems =
                    frm.doc[
                        child_fieldname
                    ] || [];


                // ============================================
                // UPDATE EACH ROW BY INDEX
                // IMPORTANT FOR DUPLICATE ITEM CODES
                // ============================================

                rows.forEach(
                    function (r, index) {

                        let soRow =
                            soItems[index];

                        if (!soRow) {
                            return;
                        }


                        let data =
                            itemMap[
                                r.item_code
                            ] || {};


                        if (
                            data.item_name
                        ) {

                            soRow.item_name =
                                data.item_name;
                        }


                        if (
                            data.stock_uom
                        ) {

                            soRow.stock_uom =
                                data.stock_uom;

                            soRow.uom =
                                data.stock_uom;
                        }


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


                        // ====================================
                        // FINAL DELIVERY DATE SAFETY
                        // ====================================

                        if (
                            !soRow.delivery_date
                        ) {

                            soRow.delivery_date = originalSalesOrderDeliveryDate;
                        }
                    }
                );


                // ============================================
                // FORCE NUMERIC VALUES
                // ============================================

                soItems.forEach(
                    function (item) {

                        if (
                            item.conversion_factor !==
                            undefined
                        ) {

                            item.conversion_factor =
                                parseFloat(
                                    item.conversion_factor
                                );

                            if (
                                isNaN(
                                    item.conversion_factor
                                ) ||
                                item.conversion_factor <= 0
                            ) {

                                item.conversion_factor =
                                    1;
                            }
                        }


                        if (
                            item.qty !==
                            undefined
                        ) {

                            item.qty =
                                parseFloat(
                                    item.qty
                                ) || 0;
                        }


                        if (
                            item.amount !==
                            undefined
                        ) {

                            item.amount =
                                parseFloat(
                                    item.amount
                                ) || 0;
                        }
                    }
                );


                frm.refresh_field(
                    child_fieldname
                );


                // ============================================
                // SAVE SALES ORDER
                // ============================================
                // frm.doc.delivery_date = originalSalesOrderDeliveryDate;
                // frm.refresh_field("delivery_date");

                // frm.save()
                console.log(
                    "BEFORE SAVE - Original SO Date:",
                    originalSalesOrderDeliveryDate
                );

                console.log(
                    "BEFORE SAVE - Current SO Date:",
                    frm.doc.delivery_date
                );

                console.log(
                    "BEFORE SAVE - First Item Date:",
                    frm.doc.items &&
                    frm.doc.items.length
                        ? frm.doc.items[0].delivery_date
                        : null
                );


                // Restore header
                frm.doc.delivery_date =
                    originalSalesOrderDeliveryDate;

                frm.refresh_field("delivery_date");


                console.log(
                    "AFTER RESTORE - SO Date:",
                    frm.doc.delivery_date
                );


                frm.save()

                    .then(function () {

                        frappe.dom.unfreeze();

                        dialog.hide();

                        frappe.show_alert({

                            message:
                                "Sales Order saved successfully",

                            indicator:
                                "green"
                        });

                    })

                    .catch(function (err) {

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
                                (
                                    err.message ||
                                    "Check browser console and Error Log."
                                ),

                            indicator:
                                "red"
                        });
                    });

            } catch (err) {

                frappe.dom.unfreeze();

                console.error(
                    "Item processing error:",
                    err
                );

                frappe.msgprint({

                    title:
                        "Item Error",

                    message:
                        err.message ||
                        "Unable to process Item Master details.",

                    indicator:
                        "red"
                });
            }
        },

        error: function (err) {

            frappe.dom.unfreeze();

            console.error(
                "Item fetch error:",
                err
            );

            frappe.msgprint({

                title:
                    "Item Fetch Error",

                message:
                    "Unable to load Item Master details.",

                indicator:
                    "red"
            });
        }
    });
}
 });


        // ============================================================
        // GET ROWS
        // ============================================================

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

                            if (numeric_fields.has(fieldname)) {

                                value = parseFloat(value);

                                if (isNaN(value)) {
                                    value = fieldname === "conversion_factor" ? 1 : 0;
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

        // function makeCellInput(c, val) {

        //      // Delivery Date always comes from Sales Order
        //     if (c.fieldname === "delivery_date") {
        //         val = frm.doc.delivery_date || "";
        //     } else {
        //         val = val || "";
        //     }
        function makeCellInput(c, val) {
            // Delivery Date:
            // keep item-specific date if available,
            // otherwise use Sales Order date as default
            if (c.fieldname === "delivery_date") {
                val = val || frm.doc.delivery_date || "";
            } else {
                val = val || "";
            }

            

            // --------------------------------------------------------
            // LINK
            // --------------------------------------------------------

            if (c.fieldtype === "Link") {

                let listId = "dl-" + c.fieldname + "-" + frappe.utils.get_random(6);

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
                    <datalist id="${listId}"></datalist>
                `;
            }

            // --------------------------------------------------------
            // DATE
            // --------------------------------------------------------

            if (c.fieldtype === "Date") {

                let dateValue = val || "";

                // Excel serial date
                if (typeof dateValue === "number" && !isNaN(dateValue)) {

                    let parsed = XLSX.SSF.parse_date_code(dateValue);

                    if (parsed) {
                        dateValue =
                            String(parsed.d).padStart(2, "0") + "-" +
                            String(parsed.m).padStart(2, "0") + "-" +
                            String(parsed.y);
                    }
                }
                // YYYY-MM-DD -> DD-MM-YYYY
                else if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {

                    let parts = dateValue.split("-");
                    dateValue = parts[2] + "-" + parts[1] + "-" + parts[0];
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

            if (c.fieldtype === "Float" || c.fieldtype === "Int") {

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

        function renderTable(data) {

            let headerCells = `
                <th style="min-width:40px;">
                    <input type="checkbox" id="select-all-cb">
                </th>
            `;

            columns.forEach(function (c) {
                headerCells += `
                    <th style="min-width:150px; padding:6px; white-space:nowrap;">
                        ${c.label}
                    </th>
                `;
            });

            let bodyRows = "";

            data.forEach(function (rowData) {

                bodyRows += `<tr>`;

                bodyRows += `
                    <td>
                        <input type="checkbox" class="row-select-cb">
                    </td>
                `;

                columns.forEach(function (c) {
                    bodyRows += `
                        <td>${makeCellInput(c, rowData[c.fieldname])}</td>
                    `;
                });

                bodyRows += `</tr>`;
            });

            let html = `
                <div style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;">

                    <button class="btn btn-sm btn-default" id="add-row-btn">+ Add Row</button>
                    <button class="btn btn-sm btn-danger" id="delete-row-btn">Delete Selected</button>
                    <button class="btn btn-sm btn-default" id="upload-btn">Upload Excel</button>
                    <button class="btn btn-sm btn-default" id="export-btn">Download Excel Template</button>

                    <input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display:none;">
                </div>

                <div style="overflow-x:auto; max-width:100%; border:1px solid #d1d8dd;">
                    <table class="table table-bordered" style="margin-bottom:0;">
                        <thead style="background:#f5f7fa;">
                            <tr>${headerCells}</tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>
            `;

            dialog.fields_dict.table_html.$wrapper.html(html);

            bindEvents();
            bindLinkAutocomplete();
        }


        // ============================================================
        // FETCH LINK OPTIONS
        // ============================================================

        function fetchLinkOptions($input) {

            let doctype = $input.data("doctype");
            let listId = $input.attr("list");
            let txt = $input.val();

            if (!doctype) {
                return;
            }

            frappe.call({

                method: "frappe.desk.search.search_link",

                args: {
                    doctype: doctype,
                    txt: txt || ""
                },

                callback: function (r) {

                    let options = r.message || [];

                    let $datalist = dialog.$wrapper.find("#" + listId);

                    $datalist.empty();

                    options.forEach(function (o) {
                        $datalist.append(`
                            <option value="${frappe.utils.escape_html(o.value)}">
                                ${frappe.utils.escape_html(o.description || "")}
                            </option>
                        `);
                    });
                }
            });
        }


        // ============================================================
        // LINK AUTOCOMPLETE
        // ============================================================

        function bindLinkAutocomplete() {

            dialog.$wrapper
                .find(".link-input")
                .off("focus")
                .on("focus", function () {
                    fetchLinkOptions($(this));
                });

            dialog.$wrapper
                .find(".link-input")
                .off("input")
                .on("input", frappe.utils.debounce(function () {
                    fetchLinkOptions($(this));
                }, 300));

            // ========================================================
            // ITEM CODE CHANGE - autofill from existing Item (no creation)
            // ========================================================

            if (has_item_lookup) {

                dialog.$wrapper
                    .find("input[data-fieldname='item_code']")
                    .off("change")
                    .on("change", function () {

                        let $row = $(this).closest("tr");
                        let itemCode = $(this).val();

                        if (!itemCode) {
                            return;
                        }

                        frappe.db
                            .get_value("Item", itemCode, [
                                "item_name",
                                "stock_uom",
                                "item_group",
                                "gst_hsn_code"
                            ])
                            .then(function (r) {

                                if (!r.message) {
                                    return;
                                }

                                if (r.message.item_name) {
                                    $row.find("input[data-fieldname='item_name']").val(r.message.item_name);
                                }

                                if (r.message.stock_uom) {
                                    $row.find("input[data-fieldname='uom']").val(r.message.stock_uom);
                                }

                                if (r.message.item_group) {
                                    $row.find("input[data-fieldname='item_group']").val(r.message.item_group);
                                }

                                if (r.message.gst_hsn_code) {
                                    $row.find("input[data-fieldname='gst_hsn_code']").val(r.message.gst_hsn_code);
                                }
                            });
                    });
            }
        }


        // ============================================================
        // EVENTS
        // ============================================================

        function bindEvents() {

            let $wrap = dialog.fields_dict.table_html.$wrapper;

            // ========================================================
            // ADD ROW
            // ========================================================

            $wrap
                .find("#add-row-btn")
                .off("click")
                .on("click", function () {

                    let cellsHtml = `
                        <td>
                            <input type="checkbox" class="row-select-cb">
                        </td>
                    `;

                    columns.forEach(function (c) {
                        cellsHtml += `<td>${makeCellInput(c, "")}</td>`;
                    });

                    $wrap.find("tbody").append(`<tr>${cellsHtml}</tr>`);

                    bindLinkAutocomplete();
                });

            // ========================================================
            // DELETE ROW
            // ========================================================

            $wrap
                .find("#delete-row-btn")
                .off("click")
                .on("click", function () {

                    $wrap.find("tbody tr").each(function () {

                        if ($(this).find(".row-select-cb").is(":checked")) {
                            $(this).remove();
                        }
                    });
                });

            // ========================================================
            // SELECT ALL
            // ========================================================

            $wrap
                .find("#select-all-cb")
                .off("click")
                .on("click", function () {

                    let checked = $(this).is(":checked");

                    $wrap.find(".row-select-cb").prop("checked", checked);
                });

            // ========================================================
            // UPLOAD
            // ========================================================

            $wrap
                .find("#upload-btn")
                .off("click")
                .on("click", function () {
                    $wrap.find("#excel-file-input").trigger("click");
                });

            // ========================================================
            // EXCEL UPLOAD
            // ========================================================

            $wrap
                .find("#excel-file-input")
                .off("change")
                .on("change", function (e) {

                    let file = e.target.files[0];

                    if (!file) {
                        return;
                    }

                    frappe.require(
                        "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
                        function () {

                            let reader = new FileReader();

                            reader.onload = function (evt) {

                                let wb = XLSX.read(evt.target.result, {
                                    type: "array",
                                    
                                });

                                let sheet = wb.Sheets[wb.SheetNames[0]];

                                // ====================================================
                                // READ ONLY ACTUAL USED EXCEL ROWS
                                // ====================================================

                                let cellRefs = Object.keys(sheet).filter(key => !key.startsWith("!"));

                                let lastUsedRow = 0;

                                cellRefs.forEach(function (ref) {

                                    let cell = sheet[ref];

                                    if (cell && cell.v !== undefined && String(cell.v).trim() !== "") {

                                        let decoded = XLSX.utils.decode_cell(ref);

                                        if (decoded.r > lastUsedRow) {
                                            lastUsedRow = decoded.r;
                                        }
                                    }
                                });

                                if (lastUsedRow === 0) {
                                    frappe.msgprint("Excel file does not contain any data.");
                                    return;
                                }

                                let range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

                                range.e.r = lastUsedRow;

                                let aoa = XLSX.utils.sheet_to_json(sheet, {
                                    header: 1,
                                    defval: "",
                                    range: range
                                });

                                // ====================================================
                                // FIND FIELDNAME ROW DYNAMICALLY
                                // ====================================================

                                let fieldnameRow = [];
                                let fieldnameRowIndex = -1;

                                for (let i = 0; i < aoa.length; i++) {

                                    let testRow = aoa[i] || [];

                                    if (testRow.some(value => String(value || "").trim() === "item_code")) {

                                        fieldnameRow = testRow;
                                        fieldnameRowIndex = i;
                                        break;
                                    }
                                }

                                if (fieldnameRowIndex === -1) {

                                    frappe.msgprint({
                                        title: "Invalid Excel Format",
                                        message: "Fieldname row not found. Please make sure the Excel contains 'item_code'.",
                                        indicator: "red"
                                    });

                                    return;
                                }

                                // ====================================================
                                // FIND DATA START ROW
                                // ====================================================

                                let dataStartIdx = -1;

                                // Format 1: Pyro generated template with ------ separator
                                for (let i = fieldnameRowIndex + 1; i < aoa.length; i++) {

                                    if (aoa[i][0] && String(aoa[i][0]).trim().startsWith("---")) {
                                        dataStartIdx = i + 1;
                                        break;
                                    }
                                }

                                // Format 2: normal Excel, no separator - data starts right after fieldname row
                                if (dataStartIdx === -1) {
                                    dataStartIdx = fieldnameRowIndex + 1;
                                }

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
                                let invalidDeliveryDate = null;
                                for (let i = dataStartIdx; i < aoa.length; i++) {

                                    let rawRow = aoa[i] || [];

                                    let itemCode = String(rawRow[itemCodeCol] ?? "").trim();
                                    let itemName = String(rawRow[itemNameCol] ?? "").trim();

                                    if (!itemCode || !itemName) {
                                        continue;
                                    }

                                    let row = {};

                                    // fieldnameRow.forEach(function (fname, colIdx) {

                                    //     if (!fname) {
                                    //         return;
                                    //     }

                                    //          let value = rawRow[colIdx] !== undefined
                                    //             ? rawRow[colIdx]
                                    //             : "";

                                    //         // Optional item-specific Delivery Date from Excel
                                    //         if (fname === "delivery_date" && value) {

                                    //             // Excel serial date
                                    //             if (typeof value === "number") {

                                    //                 let parsed = XLSX.SSF.parse_date_code(value);

                                    //                 if (parsed) {
                                    //                     value =
                                    //                         `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
                                    //                 }
                                    //             }

                                    //             // JS Date object
                                    //             else if (value instanceof Date && !isNaN(value)) {

                                    //                 value =
                                    //                     `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
                                    //             }

                                    //             // DD-MM-YYYY
                                    //             else if (
                                    //                 typeof value === "string" &&
                                    //                 /^\d{2}-\d{2}-\d{4}$/.test(value)
                                    //             ) {

                                    //                 let parts = value.split("-");
                                    //                 value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                                    //             }

                                    //             // DD/MM/YYYY
                                    //             else if (
                                    //                 typeof value === "string" &&
                                    //                 /^\d{2}\/\d{2}\/\d{4}$/.test(value)
                                    //             ) {

                                    //                 let parts = value.split("/");
                                    //                 value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                                    //             }
                                    //         }

                                    //         row[fname] = value;
                                    //     });
                                    // // If Excel/item date is blank, use Sales Order date
                                    //     if (!row.delivery_date) {
                                    //         row.delivery_date = frm.doc.delivery_date;
                                    //     }

                                    fieldnameRow.forEach(function (fname, colIdx) {

                                        if (!fname) {
                                            return;
                                        }

                                        let value =
                                            rawRow[colIdx] !== undefined
                                                ? rawRow[colIdx]
                                                : "";

                                        
                                        if (fname === "delivery_date") {

    let cellAddress = XLSX.utils.encode_cell({
        r: range.s.r + i,
        c: range.s.c + colIdx
    });

    let excelCell = sheet[cellAddress];

    // First try exactly what Excel displays
    let dateText = "";

    if (excelCell && excelCell.w) {
        dateText = String(excelCell.w).trim();
    } else if (excelCell) {
        dateText = String(
            XLSX.utils.format_cell(excelCell) || ""
        ).trim();
    } else {
        dateText = String(value || "").trim();
    }

    console.log(
        "DELIVERY DATE CHECK =>",
        "Row:", i + 1,
        "Raw:", value,
        "Text:", dateText,
        "Cell:", excelCell
    );

    // Blank date is allowed
    if (dateText !== "") {

        // Always:
        // first = DAY
        // second = MONTH
        // third = YEAR
        let parts = dateText.split(/[-\/.\s]+/);

        if (
            parts.length !== 3 ||
            !/^\d{1,2}$/.test(parts[0]) ||
            !/^\d{1,2}$/.test(parts[1]) ||
            // !/^\d{4}$/.test(parts[2])
            !/^\d{2,4}$/.test(parts[2])
        ) {
            invalidDeliveryDate = {
                row: i + 1,
                value: dateText
            };

            return;
        }

        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        // let year = parseInt(parts[2], 10);
        let year = parseInt(parts[2], 10);

                if (year < 100) {
                    year += 2000;
                }

        let testDate = new Date(
            year,
            month - 1,
            day
        );

        if (
            testDate.getFullYear() !== year ||
            testDate.getMonth() !== month - 1 ||
            testDate.getDate() !== day
        ) {
            invalidDeliveryDate = {
                row: i + 1,
                value: dateText
            };

            return;
        }

        value =
            String(year).padStart(4, "0") +
            "-" +
            String(month).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0");
    }
}

                                        row[fname] = value;
                                    });


                                    // ====================================================
                                    // FALLBACK TO SALES ORDER DATE
                                    // ====================================================
                                    // if (!row.delivery_date) {

                                    //     row.delivery_date = frm.doc.delivery_date;
                                    // }
                                    if (!row.delivery_date) {

                                        row.delivery_date =
                                            originalSalesOrderDeliveryDate;
                                    }
                                    
                                    if (String(row.item_code || "").trim() && String(row.item_name || "").trim()) {
                                        mappedRows.push(row);
                                    }
                                }
                                if (invalidDeliveryDate) {

                                frappe.msgprint({
                                    title: "Invalid Delivery Date",
                                    message:
                                        "Invalid Delivery Date found in Excel row " +
                                        invalidDeliveryDate.row +
                                        ".<br><br>" +
                                        "Please use Day-Month-Year format only.<br><br>" +
                                        "Allowed formats:<br>" +
                                        "<b>11-10-2026</b><br>" +
                                        "<b>11/10/2026</b><br>" +
                                        "<b>11.10.2026</b><br>" +
                                        "<b>11 10 2026</b>",
                                    indicator: "red"
                                });

                                e.target.value = "";
                                return;
                            }

                            renderTable(mappedRows);

                            // renderTable(mappedRows);

                                frappe.show_alert({
                                    message: "Excel data loaded",
                                    indicator: "green"
                                });
                            };

                            reader.readAsArrayBuffer(file);
                        }
                    );
                });

            // ========================================================
            // EXPORT EXCEL
            // ========================================================

            $wrap
                .find("#export-btn")
                .off("click")
                .on("click", function () {

                    frappe.require(
                        "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
                        function () {

                            let currentRows = getRowsFromTable().filter(
                                r => !anchor_field || r[anchor_field]
                            );

                            let aoa = [];

                            aoa.push(["Pyro Template - " + opts.template_name]);
                            aoa.push(columns.map(c => c.label));
                            aoa.push(columns.map(c => c.fieldname));
                            aoa.push(columns.map(c => c.fieldtype === "Date" ? "dd-mm-yyyy" : ""));
                            aoa.push([]);
                            aoa.push(["Fill data in the rows below. Do not edit the header rows above."]);
                            aoa.push(["Do not remove or reorder the fieldname row (row 3)."]);
                            aoa.push(["------"]);

                            if (currentRows.length) {

                                currentRows.forEach(function (r) {
                                    aoa.push(columns.map(c => r[c.fieldname] || ""));
                                });
                            }
                            else {
                                aoa.push(columns.map(() => ""));
                            }

                            let ws = XLSX.utils.aoa_to_sheet(aoa);
                            let deliveryDateColIndex =
    columns.findIndex(
        c => c.fieldname === "delivery_date"
    );

if (deliveryDateColIndex !== -1) {

    // Data starts from Excel row 9
    // Make delivery_date cells Text format
    for (let r = 8; r < 1000; r++) {

        let cellAddress =
            XLSX.utils.encode_cell({
                r: r,
                c: deliveryDateColIndex
            });

        if (!ws[cellAddress]) {
            ws[cellAddress] = {
                t: "s",
                v: ""
            };
        }

        ws[cellAddress].z = "@";
    }

    // Extend worksheet range so formatting is preserved
    let sheetRange =
        XLSX.utils.decode_range(ws["!ref"]);

    sheetRange.e.r =
        Math.max(
            sheetRange.e.r,
            999
        );

    ws["!ref"] =
        XLSX.utils.encode_range(
            sheetRange
        );
}

                            ws["!cols"] = columns.map(() => ({ wch: 20 }));

                            let wb = XLSX.utils.book_new();

                            XLSX.utils.book_append_sheet(wb, ws, "Items");

                            XLSX.writeFile(wb, "pyro_template_" + opts.template_name + ".xlsx");
                        }
                    );
                });
        }


        // ============================================================
        // INITIAL TABLE
        // ============================================================

        renderTable(existingData.length ? existingData : [{}]);

        dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");

        dialog.show();
    }
};