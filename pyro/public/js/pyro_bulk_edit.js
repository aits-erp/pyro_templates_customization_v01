window.pyro = window.pyro || {};

pyro.bulk_edit = {
    open: function (frm, opts) {
        frappe.call({
            method: "pyro.api.get_doctype_fields",
            args: { doctype: opts.child_doctype },
            callback: function (res) {
                let allFields = res.message || [];
                let mandatoryFields = allFields.filter(f => f.reqd);

                frappe.db.get_doc("Pyro Series Config", opts.template_name).then(templateDoc => {
                    let includedCustom = (templateDoc.fields_table || []).filter(f => f.include);
                    let seen = {};
                    let columns = [];

                    mandatoryFields.forEach(f => {
                        columns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options });
                        seen[f.fieldname] = true;
                    });
                    includedCustom.forEach(f => {
                        if (!seen[f.fieldname]) {
                            // columns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype });
                            columns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.field_type });
                            seen[f.fieldname] = true;
                        }
                    });

                    pyro.bulk_edit._render(frm, columns, opts);
                });
            }
        });
    },

    _render: function (frm, columns, opts) {
        let child_fieldname = opts.child_fieldname;
        let anchor_field = columns[0] ? columns[0].fieldname : null;
        let has_item_lookup = columns.some(c => c.fieldname === "item_code" && c.options === "Item");
        let existingData = (frm.doc[child_fieldname] || []).map(r => ({ ...r }));

        let dialog = new frappe.ui.Dialog({
            title: frm.doc.doctype + " Items - " + opts.template_name,
            size: "extra-large",
            fields: [{ fieldname: "table_html", fieldtype: "HTML" }],
            primary_action_label: "Save",
            primary_action: function () {
                let rows = getRowsFromTable();
                if (!anchor_field || !rows.some(r => r[anchor_field])) {
                    frappe.msgprint(`Enter at least one row with a valid ${anchor_field || "key field"}`);
                    return;
                }

                frm.clear_table(child_fieldname);
                rows.forEach(r => {
                    if (anchor_field && !r[anchor_field]) return;
                    let row = frm.add_child(child_fieldname);
                    columns.forEach(c => { row[c.fieldname] = r[c.fieldname]; });
                });
                frm.refresh_field(child_fieldname);
                frm.dirty();

                frappe.dom.freeze("Saving...");
                let safetyTimeout = setTimeout(() => frappe.dom.unfreeze(), 8000);

                frm.save()
                    .then(() => {
                        clearTimeout(safetyTimeout);
                        frappe.dom.unfreeze();
                        dialog.hide();
                        frappe.show_alert({ message: "Saved successfully", indicator: "green" });
                    })
                    .catch((err) => {
                        clearTimeout(safetyTimeout);
                        frappe.dom.unfreeze();
                        console.error("Save error:", err);
                        frappe.msgprint({
                            title: "Save Failed",
                            message: "Check console (F12) for exact error. Your data is still here.",
                            indicator: "red"
                        });
                    });
            }
        });

        function getRowsFromTable() {
            let rows = [];
            dialog.$wrapper.find("tbody tr").each(function () {
                let row = {};
                $(this).find("input.cell-input").each(function () {
                    row[$(this).data("fieldname")] = $(this).val();
                });
                rows.push(row);
            });
            return rows;
        }

        function makeCellInput(c, val) {
            val = val || "";
            if (c.fieldtype === "Link") {
                let listId = "dl-" + c.fieldname + "-" + frappe.utils.get_random(6);
                return `
                    <input type="text" list="${listId}" class="cell-input form-control link-input"
                        data-fieldname="${c.fieldname}" data-doctype="${c.options}"
                        value="${frappe.utils.escape_html(val)}" autocomplete="off">
                    <datalist id="${listId}"></datalist>
                `;
            }
            if (c.fieldtype === "Date") {
                return `<input type="date" class="cell-input form-control"
                    data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
            }
            if (c.fieldtype === "Float" || c.fieldtype === "Int") {
                return `<input type="number" step="any" class="cell-input form-control"
                    data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
            }
            return `<input type="text" class="cell-input form-control"
                data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
        }

        function renderTable(data) {
            let headerCells = `<th style="min-width:40px;"><input type="checkbox" id="select-all-cb"></th>`;
            columns.forEach(c => {
                headerCells += `<th style="min-width:150px; padding:6px; white-space:nowrap;">${c.label}</th>`;
            });

            let bodyRows = "";
            data.forEach((rowData) => {
                bodyRows += `<tr>`;
                bodyRows += `<td><input type="checkbox" class="row-select-cb"></td>`;
                columns.forEach(c => {
                    bodyRows += `<td>${makeCellInput(c, rowData[c.fieldname])}</td>`;
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
                        <thead style="background:#f5f7fa;"><tr>${headerCells}</tr></thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>
            `;
            dialog.fields_dict.table_html.$wrapper.html(html);
            bindEvents();
            bindLinkAutocomplete();
        }

        function fetchLinkOptions($input) {
            let doctype = $input.data("doctype");
            let listId = $input.attr("list");
            let txt = $input.val();
            if (!doctype) return;
            frappe.call({
                method: "frappe.desk.search.search_link",
                args: { doctype: doctype, txt: txt || "" },
                callback: function (r) {
                    let options = r.message || [];
                    let $datalist = dialog.$wrapper.find("#" + listId);
                    $datalist.empty();
                    options.forEach(o => {
                        $datalist.append(`<option value="${frappe.utils.escape_html(o.value)}">${frappe.utils.escape_html(o.description || "")}</option>`);
                    });
                }
            });
        }

        function bindLinkAutocomplete() {
            dialog.$wrapper.find(".link-input").off("focus").on("focus", function () { fetchLinkOptions($(this)); });
            dialog.$wrapper.find(".link-input").off("input").on("input", frappe.utils.debounce(function () { fetchLinkOptions($(this)); }, 300));

            if (has_item_lookup) {
                dialog.$wrapper.find("input[data-fieldname='item_code']").off("change").on("change", function () {
                    let $row = $(this).closest("tr");
                    let itemCode = $(this).val();
                    if (!itemCode) return;
                    frappe.db.get_value("Item", itemCode, ["item_name", "stock_uom"]).then(r => {
                        if (r.message) {
                            if (r.message.item_name) $row.find("input[data-fieldname='item_name']").val(r.message.item_name);
                            if (r.message.stock_uom) $row.find("input[data-fieldname='uom']").val(r.message.stock_uom);
                        }
                    });
                });
            }
        }

        function bindEvents() {
            dialog.$wrapper.find("#add-row-btn").off("click").on("click", function () {
                let cellsHtml = `<td><input type="checkbox" class="row-select-cb"></td>`;
                columns.forEach(c => { cellsHtml += `<td>${makeCellInput(c, "")}</td>`; });
                dialog.$wrapper.find("tbody").append(`<tr>${cellsHtml}</tr>`);
                bindLinkAutocomplete();
            });

            dialog.$wrapper.find("#delete-row-btn").off("click").on("click", function () {
                dialog.$wrapper.find("tbody tr").each(function () {
                    if ($(this).find(".row-select-cb").is(":checked")) $(this).remove();
                });
            });

            dialog.$wrapper.find("#select-all-cb").off("click").on("click", function () {
                let checked = $(this).is(":checked");
                dialog.$wrapper.find(".row-select-cb").prop("checked", checked);
            });

            dialog.$wrapper.find("#upload-btn").off("click").on("click", function () {
                dialog.$wrapper.find("#excel-file-input").trigger("click");
            });

            dialog.$wrapper.find("#excel-file-input").off("change").on("change", function (e) {
                let file = e.target.files[0];
                if (!file) return;
                frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
                    let reader = new FileReader();
                    reader.onload = function (evt) {
                        let wb = XLSX.read(evt.target.result, { type: "array" });
                        let sheet = wb.Sheets[wb.SheetNames[0]];
                        let aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                        let fieldnameRow = aoa[2] || [];
                        let dataStartIdx = -1;
                        for (let i = 0; i < aoa.length; i++) {
                            if (aoa[i][0] && aoa[i][0].toString().trim().startsWith("---")) {
                                dataStartIdx = i + 1;
                                break;
                            }
                        }
                        if (dataStartIdx === -1) dataStartIdx = 8;

                        let mappedRows = [];
                        for (let i = dataStartIdx; i < aoa.length; i++) {
                            let rawRow = aoa[i];
                            if (!rawRow || rawRow.every(v => v === "" || v === undefined)) continue;
                            let row = {};
                            fieldnameRow.forEach((fname, colIdx) => {
                                if (fname) row[fname] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : "";
                            });
                            mappedRows.push(row);
                        }

                        renderTable(mappedRows.length ? mappedRows : [{}]);
                        frappe.show_alert({ message: "Excel data loaded", indicator: "green" });
                    };
                    reader.readAsArrayBuffer(file);
                });
            });

            dialog.$wrapper.find("#export-btn").off("click").on("click", function () {
                frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
                    let currentRows = getRowsFromTable().filter(r => !anchor_field || r[anchor_field]);

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
                        currentRows.forEach(r => aoa.push(columns.map(c => r[c.fieldname] || "")));
                    } else {
                        aoa.push(columns.map(() => ""));
                    }

                    let ws = XLSX.utils.aoa_to_sheet(aoa);
                    ws["!cols"] = columns.map(() => ({ wch: 20 }));
                    let wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Items");
                    XLSX.writeFile(wb, "pyro_template_" + opts.template_name + ".xlsx");
                });
            });
        }

        renderTable(existingData.length ? existingData : [{}]);
        dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
        dialog.show();
    }
};