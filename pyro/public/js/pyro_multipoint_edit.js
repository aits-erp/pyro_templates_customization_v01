// window.pyro = window.pyro || {};

// pyro.multipoint_edit = {
//     open: function (frm, opts) {
//         frappe.call({
//             method: "pyro.api.get_doctype_fields",
//             args: { doctype: opts.child_doctype },
//             callback: function (res) {
//                 let allFields = res.message || [];
//                 let mandatoryFields = allFields.filter(f => f.reqd);

//                 frappe.call({
//                     method: "pyro.api.get_multipoint_point_fields",
//                     callback: function (pf) {
//                         let pointFields = pf.message || [];

//                         frappe.db.get_doc("Pyro Series Config", opts.template_name).then(templateDoc => {
//                             let includedItemFields = (templateDoc.fields_table || []).filter(f => f.include);
//                             let seen = {};
//                             let itemColumns = [];

//                             mandatoryFields.forEach(f => {
//                                 itemColumns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options, is_item: true });
//                                 seen[f.fieldname] = true;
//                             });
//                             includedItemFields.forEach(f => {
//                                 if (!seen[f.fieldname]) {
//                                     itemColumns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.field_type, is_item: true });
//                                     seen[f.fieldname] = true;
//                                 }
//                             });

//                             let includedPointFields = (templateDoc.point_fields_table || []).filter(f => f.include);
//                             let pointColumns = (includedPointFields.length
//                                 ? pointFields.filter(pf2 => includedPointFields.some(ip => ip.fieldname === pf2.fieldname))
//                                 : pointFields
//                             ).map(c => ({ ...c, is_item: false }));

//                             let allColumns = itemColumns.concat(pointColumns);

//                             pyro.multipoint_edit._render(frm, itemColumns, pointColumns, allColumns, opts);
//                         });
//                     }
//                 });
//             }
//         });
//     },

//     _render: function (frm, itemColumns, pointColumns, allColumns, opts) {
//         let child_fieldname = opts.child_fieldname;
//         let anchor_field = itemColumns[0] ? itemColumns[0].fieldname : null;

//         let rowOptions = (frm.doc[child_fieldname] || []).map((r, i) =>
//             `${i + 1} - ${r[anchor_field] || "(blank)"}  [${r.name || "unsaved"}]`
//         );
//         rowOptions.unshift("+ New Row");

//         let dialog = new frappe.ui.Dialog({
//             title: "Multipoint Template - " + opts.template_name,
//             size: "extra-large",
//             fields: [
//                 {
//                     fieldname: "row_picker",
//                     fieldtype: "Select",
//                     label: "Select Item Row",
//                     options: rowOptions.join("\n"),
//                     default: rowOptions[0]
//                 },
//                 { fieldname: "table_html", fieldtype: "HTML" }
//             ],
//             primary_action_label: "Save",
//             primary_action: function () {
//                 pyro.multipoint_edit._save(frm, dialog, itemColumns, pointColumns, allColumns, opts, anchor_field);
//             }
//         });

//         let currentItemRowUid = null;

//         function loadItemRow(selection) {
//             let items = frm.doc[child_fieldname] || [];
//             let itemData = {};
//             if (selection && selection !== "+ New Row") {
//                 let idx = parseInt(selection.split(" - ")[0]) - 1;
//                 itemData = { ...items[idx] };
//                 currentItemRowUid = itemData.custom_pyro_row_uid || null;
//             } else {
//                 itemData = {};
//                 currentItemRowUid = null;
//             }

//             if (!currentItemRowUid) {
//                 renderTable([mergeRow({}, itemData)]);
//                 return;
//             }

//             frappe.call({
//                 method: "pyro.api.get_multipoint_points",
//                 args: {
//                     parent_doctype: frm.doc.doctype,
//                     parent_name: frm.doc.name,
//                     item_row: currentItemRowUid
//                 },
//                 callback: function (r) {
//                     let points = (r.message && r.message.length) ? r.message : [{}];
//                     let rows = points.map((p, i) => i === 0 ? mergeRow(p, itemData) : mergeRow(p, {}));
//                     renderTable(rows);
//                 }
//             });
//         }

//         function mergeRow(pointData, itemData) {
//             let row = {};
//             allColumns.forEach(c => {
//                 let val = c.is_item ? (itemData[c.fieldname] || "") : (pointData[c.fieldname] || "");
//                 if (c.fieldtype === "Date" && val) val = formatDateForDisplay(val);
//                 row[c.fieldname] = val;
//             });
//             return row;
//         }

//         // yyyy-mm-dd (from DB) -> dd-mm-yyyy (for display in the table)
//         function formatDateForDisplay(val) {
//             if (!val) return "";
//             let s = String(val);
//             let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
//             if (m) return `${m[3]}-${m[2]}-${m[1]}`;
//             return s;
//         }

//         // dd-mm-yyyy (typed/uploaded) -> yyyy-mm-dd (for saving to Frappe)
//         function formatDateForSave(val) {
//             if (!val) return "";
//             let s = String(val).trim();
//             let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
//             if (m) {
//                 let dd = m[1].padStart(2, "0");
//                 let mm = m[2].padStart(2, "0");
//                 return `${m[3]}-${mm}-${dd}`;
//             }
//             // already yyyy-mm-dd or unrecognized — leave as-is
//             return s;
//         }

//         function coerceValue(fieldtype, val) {
//             if (val === undefined || val === null || val === "") return val;
//             if (fieldtype === "Date") return formatDateForSave(val);
//             if (fieldtype === "Float" || fieldtype === "Int") {
//                 let n = Number(val);
//                 return isNaN(n) ? val : n;
//             }
//             return val;
//         }

//         function makeCellInput(c, val) {
//             val = val === undefined || val === null ? "" : val;
//             if (c.fieldtype === "Link") {
//                 let listId = "dl-" + c.fieldname + "-" + frappe.utils.get_random(6);
//                 return `
//                     <input type="text" list="${listId}" class="cell-input form-control link-input"
//                         data-fieldname="${c.fieldname}" data-doctype="${c.options}"
//                         value="${frappe.utils.escape_html(val)}" autocomplete="off">
//                     <datalist id="${listId}"></datalist>
//                 `;
//             }
//             if (c.fieldtype === "Date") {
//                 return `<input type="text" placeholder="dd-mm-yyyy" class="form-control cell-input"
//                     data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
//             }
//             if (c.fieldtype === "Float" || c.fieldtype === "Int") {
//                 return `<input type="number" step="any" class="form-control cell-input"
//                     data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
//             }
//             return `<input type="text" class="form-control cell-input"
//                 data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
//         }

//         function renderTable(data) {
//             let headerCells = `<th style="min-width:40px;"><input type="checkbox" id="mp-select-all"></th>`;
//             allColumns.forEach(c => headerCells += `<th style="min-width:150px; white-space:nowrap;">${c.label}${c.fieldtype === "Date" ? " (dd-mm-yyyy)" : ""}</th>`);

//             let bodyRows = "";
//             data.forEach((row) => {
//                 bodyRows += `<tr><td><input type="checkbox" class="mp-row-select"></td>`;
//                 allColumns.forEach(c => { bodyRows += `<td>${makeCellInput(c, row[c.fieldname])}</td>`; });
//                 bodyRows += `</tr>`;
//             });

//             let html = `
//                 <div style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;">
//                     <button class="btn btn-sm btn-default" id="mp-add-row">+ Add Row</button>
//                     <button class="btn btn-sm btn-danger" id="mp-delete-row">Delete Selected</button>
//                     <button class="btn btn-sm btn-default" id="mp-upload">Upload Excel</button>
//                     <button class="btn btn-sm btn-default" id="mp-export">Download Excel Template</button>
//                     <input type="file" id="mp-file-input" accept=".xlsx,.xls" style="display:none;">
//                 </div>
//                 <div style="overflow-x:auto; max-width:100%; border:1px solid #d1d8dd;">
//                     <table class="table table-bordered" style="margin-bottom:0;">
//                         <thead style="background:#f5f7fa;"><tr>${headerCells}</tr></thead>
//                         <tbody>${bodyRows}</tbody>
//                     </table>
//                 </div>
//             `;
//             dialog.fields_dict.table_html.$wrapper.html(html);
//             bindEvents();
//             bindLinkAutocomplete();
//         }

//         function getRowsFromTable() {
//             let rows = [];
//             dialog.fields_dict.table_html.$wrapper.find("tbody tr").each(function () {
//                 let row = {};
//                 $(this).find("input.cell-input").each(function () {
//                     row[$(this).data("fieldname")] = $(this).val();
//                 });
//                 rows.push(row);
//             });
//             return rows;
//         }

//         function fetchLinkOptions($input) {
//             let doctype = $input.data("doctype");
//             let listId = $input.attr("list");
//             let txt = $input.val();
//             if (!doctype) return;
//             frappe.call({
//                 method: "frappe.desk.search.search_link",
//                 args: { doctype: doctype, txt: txt || "" },
//                 callback: function (r) {
//                     let options = r.message || [];
//                     let $datalist = dialog.$wrapper.find("#" + listId);
//                     $datalist.empty();
//                     options.forEach(o => {
//                         $datalist.append(`<option value="${frappe.utils.escape_html(o.value)}">${frappe.utils.escape_html(o.description || "")}</option>`);
//                     });
//                 }
//             });
//         }

//         function bindLinkAutocomplete() {
//             dialog.$wrapper.find(".link-input").off("focus").on("focus", function () { fetchLinkOptions($(this)); });
//             dialog.$wrapper.find(".link-input").off("input").on("input", frappe.utils.debounce(function () { fetchLinkOptions($(this)); }, 300));

//             let has_item_lookup = allColumns.some(c => c.fieldname === "item_code" && c.options === "Item");
//             if (has_item_lookup) {
//                 dialog.$wrapper.find("input[data-fieldname='item_code']").off("change").on("change", function () {
//                     let $row = $(this).closest("tr");
//                     let itemCode = $(this).val();
//                     if (!itemCode) return;
//                     frappe.db.get_value("Item", itemCode, ["item_name", "stock_uom"]).then(r => {
//                         if (r.message) {
//                             if (r.message.item_name) $row.find("input[data-fieldname='item_name']").val(r.message.item_name);
//                             if (r.message.stock_uom) $row.find("input[data-fieldname='uom']").val(r.message.stock_uom);
//                         }
//                     });
//                 });
//             }
//         }

//         function bindEvents() {
//             let $wrap = dialog.fields_dict.table_html.$wrapper;

//             $wrap.find("#mp-add-row").off("click").on("click", function () {
//                 let cellsHtml = `<td><input type="checkbox" class="mp-row-select"></td>`;
//                 allColumns.forEach(c => { cellsHtml += `<td>${makeCellInput(c, "")}</td>`; });
//                 $wrap.find("tbody").append(`<tr>${cellsHtml}</tr>`);
//                 bindLinkAutocomplete();
//             });

//             $wrap.find("#mp-delete-row").off("click").on("click", function () {
//                 $wrap.find("tbody tr").each(function () {
//                     if ($(this).find(".mp-row-select").is(":checked")) $(this).remove();
//                 });
//             });

//             $wrap.find("#mp-select-all").off("click").on("click", function () {
//                 let checked = $(this).is(":checked");
//                 $wrap.find(".mp-row-select").prop("checked", checked);
//             });

//             $wrap.find("#mp-upload").off("click").on("click", function () {
//                 $wrap.find("#mp-file-input").trigger("click");
//             });

//             $wrap.find("#mp-file-input").off("change").on("change", function (e) {
//                 let file = e.target.files[0];
//                 if (!file) return;
//                 frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
//                     let reader = new FileReader();
//                     reader.onload = function (evt) {
//                         let wb = XLSX.read(evt.target.result, { type: "array" });
//                         let sheet = wb.Sheets[wb.SheetNames[0]];
//                         let aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

//                         let fieldnameRow = aoa[2] || [];
//                         let dataStartIdx = -1;
//                         for (let i = 0; i < aoa.length; i++) {
//                             if (aoa[i][0] && aoa[i][0].toString().trim().startsWith("---")) {
//                                 dataStartIdx = i + 1;
//                                 break;
//                             }
//                         }
//                         if (dataStartIdx === -1) dataStartIdx = 8;

//                         let mappedRows = [];
//                         for (let i = dataStartIdx; i < aoa.length; i++) {
//                             let rawRow = aoa[i];
//                             if (!rawRow || rawRow.every(v => v === "" || v === undefined)) continue;
//                             let row = {};
//                             fieldnameRow.forEach((fname, colIdx) => {
//                                 if (fname) row[fname] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : "";
//                             });
//                             mappedRows.push(row);
//                         }

//                         renderTable(mappedRows.length ? mappedRows : [{}]);
//                         frappe.show_alert({ message: "Data loaded from Excel", indicator: "green" });
//                     };
//                     reader.readAsArrayBuffer(file);
//                 });
//             });

//             $wrap.find("#mp-export").off("click").on("click", function () {
//                 frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
//                     let currentRows = getRowsFromTable();

//                     let aoa = [];
//                     aoa.push(["Pyro Multipoint Template - " + opts.template_name]);
//                     aoa.push(allColumns.map(c => c.label));
//                     aoa.push(allColumns.map(c => c.fieldname));
//                     aoa.push([]);
//                     aoa.push(["Row 1: fill item columns + first point. Other rows: only point columns. Dates: dd-mm-yyyy."]);
//                     aoa.push(["Do not remove or reorder the fieldname row (row 3)."]);
//                     aoa.push(["------"]);

//                     if (currentRows.length) {
//                         currentRows.forEach(r => aoa.push(allColumns.map(c => r[c.fieldname] || "")));
//                     } else {
//                         aoa.push(allColumns.map(() => ""));
//                     }

//                     let ws = XLSX.utils.aoa_to_sheet(aoa);
//                     ws["!cols"] = allColumns.map(() => ({ wch: 18 }));
//                     let wb = XLSX.utils.book_new();
//                     XLSX.utils.book_append_sheet(wb, ws, "Multipoint");
//                     XLSX.writeFile(wb, "pyro_multipoint_" + opts.template_name + ".xlsx");
//                 });
//             });
//         }

//         dialog.fields_dict.row_picker.df.onchange = function () {
//             loadItemRow(dialog.get_value("row_picker"));
//         };

//         dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
//         dialog.show();
//         loadItemRow(rowOptions[0]);

//         // expose for _save to use the same coercion
//         dialog._pyro_coerceValue = coerceValue;
//     },

//     _save: function (frm, dialog, itemColumns, pointColumns, allColumns, opts, anchor_field) {
//         let coerceValue = dialog._pyro_coerceValue || function (t, v) { return v; };

//         let rows = [];
//         dialog.fields_dict.table_html.$wrapper.find("tbody tr").each(function () {
//             let row = {};
//             $(this).find("input.cell-input").each(function () {
//                 row[$(this).data("fieldname")] = $(this).val();
//             });
//             rows.push(row);
//         });

//         if (!rows.length || !rows[0][anchor_field]) {
//             frappe.msgprint(`Row 1 must have a valid ${anchor_field}.`);
//             return;
//         }

//         let itemRow = rows[0];
//         let selection = dialog.get_value("row_picker");
//         let items = frm.doc[opts.child_fieldname] || [];
//         let row;

//         if (selection && selection !== "+ New Row") {
//             let idx = parseInt(selection.split(" - ")[0]) - 1;
//             row = items[idx];
//         } else {
//             let emptyRow = items.find(r => !r[anchor_field]);
//             row = emptyRow ? emptyRow : frm.add_child(opts.child_fieldname);
//         }

//         itemColumns.forEach(c => {
//             row[c.fieldname] = coerceValue(c.fieldtype, itemRow[c.fieldname]);
//         });

//         if (!row.delivery_date && frm.doc.delivery_date) {
//             row.delivery_date = frm.doc.delivery_date;
//         }

//         if (!row.custom_pyro_row_uid) {
//             row.custom_pyro_row_uid = frappe.utils.get_random(10);
//         }
//         let itemRowUid = row.custom_pyro_row_uid;

//         frm.refresh_field(opts.child_fieldname);
//         frm.dirty();

//         frappe.dom.freeze("Saving item...");
//         frm.save().then(() => {
//             frappe.dom.unfreeze();

//             let points = rows
//                 .map(r => {
//                     let p = {};
//                     pointColumns.forEach(c => { p[c.fieldname] = coerceValue(c.fieldtype, r[c.fieldname]); });
//                     return p;
//                 })
//                 .filter(p => p.point_no);

//             if (rows.length && !points.length) {
//                 frappe.msgprint({
//                     title: "No Points Saved",
//                     message: "None of the rows had a 'Point No' value filled in — nothing was saved. Fill the Point No column (e.g. U1, U2) for each row.",
//                     indicator: "orange"
//                 });
//                 return;
//             }

//             frappe.call({
//                 method: "pyro.api.save_multipoint_points",
//                 args: {
//                     parent_doctype: frm.doc.doctype,
//                     parent_name: frm.doc.name,
//                     item_row: itemRowUid,
//                     points: JSON.stringify(points)
//                 },
//                 callback: function () {
//                     dialog.hide();
//                     frappe.show_alert({ message: "Multipoint data saved successfully", indicator: "green" });
//                 },
//                 error: function (err) {
//                     console.error("Points save error:", err);
//                     frappe.msgprint({
//                         title: "Points Save Failed",
//                         message: "Item row was saved, but points failed to save. Check console (F12).",
//                         indicator: "red"
//                     });
//                 }
//             });
//         }).catch((err) => {
//             frappe.dom.unfreeze();
//             console.error("Save error:", err);
//             frappe.msgprint({
//                 title: "Save Failed",
//                 message: "Check console (F12) for exact error.",
//                 indicator: "red"
//             });
//         });
//     },

//     view_summary: function (frm, opts) {
//         let items = (frm.doc[opts.child_fieldname] || []).filter(r => r.name);

//         if (!items.length) {
//             frappe.msgprint("No saved item rows found on this document yet.");
//             return;
//         }

//         if (items.length === 1) {
//             pyro.multipoint_edit._show_summary(frm, opts, items[0]);
//             return;
//         }

//         let rowOptions = items.map((r, i) => `${i + 1} - ${r.item_code || "(blank)"}  [${r.name}]`);

//         let pickDialog = new frappe.ui.Dialog({
//             title: "View Multipoint Details",
//             fields: [{
//                 fieldname: "row_picker",
//                 fieldtype: "Select",
//                 label: "Select Item",
//                 options: rowOptions.join("\n"),
//                 reqd: 1
//             }],
//             primary_action_label: "View",
//             primary_action: function (values) {
//                 let idx = parseInt(values.row_picker.split(" - ")[0]) - 1;
//                 let itemRow = items[idx];
//                 pickDialog.hide();
//                 pyro.multipoint_edit._show_summary(frm, opts, itemRow);
//             }
//         });
//         pickDialog.show();
//     },

//     _show_summary: function (frm, opts, itemRow) {
//         let item_row_key = itemRow.custom_pyro_row_uid || itemRow.name;

//         frappe.call({
//             method: "pyro.api.get_multipoint_summary",
//             args: {
//                 parent_doctype: frm.doc.doctype,
//                 parent_name: frm.doc.name,
//                 item_row: item_row_key
//             },
//             callback: function (r) {
//                 let points = r.message || [];
//                 if (!points.length) {
//                     frappe.msgprint("No multipoint data saved for this item yet.");
//                     return;
//                 }

//                 let headerCells = `<th>Point No</th><th>TT Tag</th><th>TE Tag</th><th>TW Tag</th>
//                     <th>Hot Junction Location mm</th><th>Head Extension N mm</th>
//                     <th>Lagging Extension T mm</th><th>Overall Length OL mm</th>`;

//                 let bodyRows = points.map(p => `
//                     <tr>
//                         <td>${p.point_no || ""}</td>
//                         <td>${p.tt_tag_number || ""}</td>
//                         <td>${p.te_tag_number || ""}</td>
//                         <td>${p.tw_tag_number || ""}</td>
//                         <td>${p.hot_junction_location_mm || ""}</td>
//                         <td>${p.head_extension_n_mm || ""}</td>
//                         <td>${p.lagging_extension_t_mm || ""}</td>
//                         <td>${p.overall_length_ol_mm || ""}</td>
//                     </tr>
//                 `).join("");

//                 let html = `
//                     <div style="margin-bottom:10px;">
//                         <b>Item:</b> ${itemRow.item_code || ""} — ${itemRow.item_name || ""}
//                         &nbsp;|&nbsp; <b>Total Points:</b> ${points.length}
//                     </div>
//                     <div style="overflow-x:auto; border:1px solid #d1d8dd;">
//                         <table class="table table-bordered" style="margin-bottom:0;">
//                             <thead style="background:#f5f7fa;"><tr>${headerCells}</tr></thead>
//                             <tbody>${bodyRows}</tbody>
//                         </table>
//                     </div>
//                 `;

//                 let viewDialog = new frappe.ui.Dialog({
//                     title: "Multipoint Details - " + (itemRow.item_code || ""),
//                     size: "large",
//                     fields: [{ fieldname: "summary_html", fieldtype: "HTML", options: html }]
//                 });
//                 viewDialog.show();
//             }
//         });
//     }
// };


window.pyro = window.pyro || {};

pyro.multipoint_edit = {
    open: function (frm, opts) {
        frappe.call({
            method: "pyro.api.get_doctype_fields",
            args: { doctype: opts.child_doctype },
            callback: function (res) {
                let allFields = res.message || [];
                let mandatoryFields = allFields.filter(f => f.reqd);

                frappe.call({
                    method: "pyro.api.get_multipoint_point_fields",
                    callback: function (pf) {
                        let pointFields = pf.message || [];

                        frappe.db.get_doc("Pyro Series Config", opts.template_name).then(templateDoc => {
                            let includedItemFields = (templateDoc.fields_table || []).filter(f => f.include);
                            let seen = {};
                            let itemColumns = [];

                            mandatoryFields.forEach(f => {
                                itemColumns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options, is_item: true });
                                seen[f.fieldname] = true;
                            });
                            includedItemFields.forEach(f => {
                                if (!seen[f.fieldname]) {
                                    itemColumns.push({ fieldname: f.fieldname, label: f.label, fieldtype: f.field_type, is_item: true });
                                    seen[f.fieldname] = true;
                                }
                            });

                            let includedPointFields = (templateDoc.point_fields_table || []).filter(f => f.include);
                            let pointColumns = (includedPointFields.length
                                ? pointFields.filter(pf2 => includedPointFields.some(ip => ip.fieldname === pf2.fieldname))
                                : pointFields
                            ).map(c => ({ ...c, is_item: false }));

                            let allColumns = itemColumns.concat(pointColumns);

                            pyro.multipoint_edit._render(frm, itemColumns, pointColumns, allColumns, opts);
                        });
                    }
                });
            }
        });
    },

    _render: function (frm, itemColumns, pointColumns, allColumns, opts) {
        let child_fieldname = opts.child_fieldname;
        let anchor_field = itemColumns[0] ? itemColumns[0].fieldname : null;

        let rowOptions = (frm.doc[child_fieldname] || []).map((r, i) =>
            `${i + 1} - ${r[anchor_field] || "(blank)"}  [${r.name || "unsaved"}]`
        );
        rowOptions.unshift("+ New Row");

        let dialog = new frappe.ui.Dialog({
            title: "Multipoint Template - " + opts.template_name,
            size: "extra-large",
            fields: [
                {
                    fieldname: "row_picker",
                    fieldtype: "Select",
                    label: "Select Item Row",
                    options: rowOptions.join("\n"),
                    default: rowOptions[0]
                },
                { fieldname: "table_html", fieldtype: "HTML" }
            ],
            primary_action_label: "Save",
            primary_action: function () {
                pyro.multipoint_edit._save(frm, dialog, itemColumns, pointColumns, allColumns, opts, anchor_field);
            }
        });

        let currentItemRowUid = null;

        function loadItemRow(selection) {
            let items = frm.doc[child_fieldname] || [];
            let itemData = {};
            if (selection && selection !== "+ New Row") {
                let idx = parseInt(selection.split(" - ")[0]) - 1;
                itemData = { ...items[idx] };
                currentItemRowUid = itemData.custom_pyro_row_uid || null;
            } else {
                itemData = {};
                currentItemRowUid = null;
            }

            if (!currentItemRowUid) {
                renderTable([mergeRow({}, itemData)]);
                return;
            }

            frappe.call({
                method: "pyro.api.get_multipoint_points",
                args: {
                    parent_doctype: frm.doc.doctype,
                    parent_name: frm.doc.name,
                    item_row: currentItemRowUid
                },
                callback: function (r) {
                    let points = (r.message && r.message.length) ? r.message : [{}];
                    let rows = points.map((p, i) => i === 0 ? mergeRow(p, itemData) : mergeRow(p, {}));
                    renderTable(rows);
                }
            });
        }

        function mergeRow(pointData, itemData) {
            let row = {};
            allColumns.forEach(c => {
                let val = c.is_item ? (itemData[c.fieldname] || "") : (pointData[c.fieldname] || "");
                if (c.fieldtype === "Date" && val) val = formatDateForDisplay(val);
                row[c.fieldname] = val;
            });
            return row;
        }

        // yyyy-mm-dd (from DB) -> dd-mm-yyyy (for display in the table)
        function formatDateForDisplay(val) {
            if (!val) return "";
            let s = String(val);
            let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return `${m[3]}-${m[2]}-${m[1]}`;
            return s;
        }

        // dd-mm-yyyy (typed/uploaded) -> yyyy-mm-dd (for saving to Frappe)
        function formatDateForSave(val) {
            if (!val) return "";
            let s = String(val).trim();
            let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
            if (m) {
                let dd = m[1].padStart(2, "0");
                let mm = m[2].padStart(2, "0");
                return `${m[3]}-${mm}-${dd}`;
            }
            // already yyyy-mm-dd or unrecognized — leave as-is
            return s;
        }

        function coerceValue(fieldtype, val) {
            if (val === undefined || val === null || val === "") return val;
            if (fieldtype === "Date") return formatDateForSave(val);
            if (fieldtype === "Float" || fieldtype === "Int") {
                let n = Number(val);
                return isNaN(n) ? val : n;
            }
            return val;
        }

        function makeCellInput(c, val) {
            val = val === undefined || val === null ? "" : val;
            if (c.readonly) {
                return `<input type="text" class="form-control cell-input" readonly
                    style="background:#f5f5f5;"
                    data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
            }
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
                return `<input type="text" placeholder="dd-mm-yyyy" class="form-control cell-input"
                    data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
            }
            if (c.fieldtype === "Float" || c.fieldtype === "Int") {
                return `<input type="number" step="any" class="form-control cell-input"
                    data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
            }
            return `<input type="text" class="form-control cell-input"
                data-fieldname="${c.fieldname}" value="${frappe.utils.escape_html(val)}">`;
        }

        function renderTable(data) {
            let headerCells = `<th style="min-width:40px;"><input type="checkbox" id="mp-select-all"></th>`;
            allColumns.forEach(c => headerCells += `<th style="min-width:150px; white-space:nowrap;">${c.label}${c.fieldtype === "Date" ? " (dd-mm-yyyy)" : ""}</th>`);

            let bodyRows = "";
            data.forEach((row, i) => {
                bodyRows += `<tr><td><input type="checkbox" class="mp-row-select"></td>`;
                allColumns.forEach(c => {
                    let val = c.fieldname === "sl_no" ? (i + 1) : row[c.fieldname];
                    bodyRows += `<td>${makeCellInput(c, val)}</td>`;
                });
                bodyRows += `</tr>`;
            });

            let html = `
                <div style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-default" id="mp-add-row">+ Add Row</button>
                    <button class="btn btn-sm btn-danger" id="mp-delete-row">Delete Selected</button>
                    <button class="btn btn-sm btn-default" id="mp-upload">Upload Excel</button>
                    <button class="btn btn-sm btn-default" id="mp-export">Download Excel Template</button>
                    <input type="file" id="mp-file-input" accept=".xlsx,.xls" style="display:none;">
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

        function getRowsFromTable() {
            let rows = [];
            dialog.fields_dict.table_html.$wrapper.find("tbody tr").each(function () {
                let row = {};
                $(this).find("input.cell-input").each(function () {
                    row[$(this).data("fieldname")] = $(this).val();
                });
                rows.push(row);
            });
            return rows;
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

            let has_item_lookup = allColumns.some(c => c.fieldname === "item_code" && c.options === "Item");
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
            let $wrap = dialog.fields_dict.table_html.$wrapper;

            $wrap.find("#mp-add-row").off("click").on("click", function () {
                let cellsHtml = `<td><input type="checkbox" class="mp-row-select"></td>`;
                allColumns.forEach(c => { cellsHtml += `<td>${makeCellInput(c, "")}</td>`; });
                $wrap.find("tbody").append(`<tr>${cellsHtml}</tr>`);
                bindLinkAutocomplete();
            });

            $wrap.find("#mp-delete-row").off("click").on("click", function () {
                $wrap.find("tbody tr").each(function () {
                    if ($(this).find(".mp-row-select").is(":checked")) $(this).remove();
                });
            });

            $wrap.find("#mp-select-all").off("click").on("click", function () {
                let checked = $(this).is(":checked");
                $wrap.find(".mp-row-select").prop("checked", checked);
            });

            $wrap.find("#mp-upload").off("click").on("click", function () {
                $wrap.find("#mp-file-input").trigger("click");
            });

            $wrap.find("#mp-file-input").off("change").on("change", function (e) {
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
                        frappe.show_alert({ message: "Data loaded from Excel", indicator: "green" });
                    };
                    reader.readAsArrayBuffer(file);
                });
            });

            $wrap.find("#mp-export").off("click").on("click", function () {
                frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
                    let currentRows = getRowsFromTable();

                    let aoa = [];
                    aoa.push(["Pyro Multipoint Template - " + opts.template_name]);
                    aoa.push(allColumns.map(c => c.label));
                    aoa.push(allColumns.map(c => c.fieldname));
                    aoa.push([]);
                    aoa.push(["Row 1: fill item columns + first point. Other rows: only point columns. Dates: dd-mm-yyyy."]);
                    aoa.push(["Do not remove or reorder the fieldname row (row 3)."]);
                    aoa.push(["------"]);

                    if (currentRows.length) {
                        currentRows.forEach(r => aoa.push(allColumns.map(c => r[c.fieldname] || "")));
                    } else {
                        aoa.push(allColumns.map(() => ""));
                    }

                    let ws = XLSX.utils.aoa_to_sheet(aoa);
                    ws["!cols"] = allColumns.map(() => ({ wch: 18 }));
                    let wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Multipoint");
                    XLSX.writeFile(wb, "pyro_multipoint_" + opts.template_name + ".xlsx");
                });
            });
        }

        dialog.fields_dict.row_picker.df.onchange = function () {
            loadItemRow(dialog.get_value("row_picker"));
        };

        dialog.$wrapper.find(".modal-dialog").css("max-width", "95vw");
        dialog.show();
        loadItemRow(rowOptions[0]);

        // expose for _save to use the same coercion
        dialog._pyro_coerceValue = coerceValue;
    },

    _save: function (frm, dialog, itemColumns, pointColumns, allColumns, opts, anchor_field) {
        let coerceValue = dialog._pyro_coerceValue || function (t, v) { return v; };

        let rows = [];
        dialog.fields_dict.table_html.$wrapper.find("tbody tr").each(function () {
            let row = {};
            $(this).find("input.cell-input").each(function () {
                row[$(this).data("fieldname")] = $(this).val();
            });
            rows.push(row);
        });

        if (!rows.length || !rows[0][anchor_field]) {
            frappe.msgprint(`Row 1 must have a valid ${anchor_field}.`);
            return;
        }

        let itemRow = rows[0];
        let selection = dialog.get_value("row_picker");
        let items = frm.doc[opts.child_fieldname] || [];
        let row;

        if (selection && selection !== "+ New Row") {
            let idx = parseInt(selection.split(" - ")[0]) - 1;
            row = items[idx];
        } else {
            let emptyRow = items.find(r => !r[anchor_field]);
            row = emptyRow ? emptyRow : frm.add_child(opts.child_fieldname);
        }

        itemColumns.forEach(c => {
            row[c.fieldname] = coerceValue(c.fieldtype, itemRow[c.fieldname]);
        });

        if (!row.delivery_date && frm.doc.delivery_date) {
            row.delivery_date = frm.doc.delivery_date;
        }

        if (!row.custom_pyro_row_uid) {
            row.custom_pyro_row_uid = frappe.utils.get_random(10);
        }
        let itemRowUid = row.custom_pyro_row_uid;

        frm.refresh_field(opts.child_fieldname);
        frm.dirty();

        frappe.dom.freeze("Saving item...");
        frm.save().then(() => {
            frappe.dom.unfreeze();

            let points = rows
                .map(r => {
                    let p = {};
                    pointColumns.forEach(c => { p[c.fieldname] = coerceValue(c.fieldtype, r[c.fieldname]); });
                    return p;
                })
                .filter(p => p.point_no);

            if (rows.length && !points.length) {
                frappe.msgprint({
                    title: "No Points Saved",
                    message: "None of the rows had a 'Point No' value filled in — nothing was saved. Fill the Point No column (e.g. U1, U2) for each row.",
                    indicator: "orange"
                });
                return;
            }

            frappe.call({
                method: "pyro.api.save_multipoint_points",
                args: {
                    parent_doctype: frm.doc.doctype,
                    parent_name: frm.doc.name,
                    item_row: itemRowUid,
                    points: JSON.stringify(points)
                },
                callback: function () {
                    dialog.hide();
                    frappe.show_alert({ message: "Multipoint data saved successfully", indicator: "green" });
                },
                error: function (err) {
                    console.error("Points save error:", err);
                    frappe.msgprint({
                        title: "Points Save Failed",
                        message: "Item row was saved, but points failed to save. Check console (F12).",
                        indicator: "red"
                    });
                }
            });
        }).catch((err) => {
            frappe.dom.unfreeze();
            console.error("Save error:", err);
            frappe.msgprint({
                title: "Save Failed",
                message: "Check console (F12) for exact error.",
                indicator: "red"
            });
        });
    },

    view_summary: function (frm, opts) {
        let items = (frm.doc[opts.child_fieldname] || []).filter(r => r.name);

        if (!items.length) {
            frappe.msgprint("No saved item rows found on this document yet.");
            return;
        }

        if (items.length === 1) {
            pyro.multipoint_edit._show_summary(frm, opts, items[0]);
            return;
        }

        let rowOptions = items.map((r, i) => `${i + 1} - ${r.item_code || "(blank)"}  [${r.name}]`);

        let pickDialog = new frappe.ui.Dialog({
            title: "View Multipoint Details",
            fields: [{
                fieldname: "row_picker",
                fieldtype: "Select",
                label: "Select Item",
                options: rowOptions.join("\n"),
                reqd: 1
            }],
            primary_action_label: "View",
            primary_action: function (values) {
                let idx = parseInt(values.row_picker.split(" - ")[0]) - 1;
                let itemRow = items[idx];
                pickDialog.hide();
                pyro.multipoint_edit._show_summary(frm, opts, itemRow);
            }
        });
        pickDialog.show();
    },

    _show_summary: function (frm, opts, itemRow) {
        let item_row_key = itemRow.custom_pyro_row_uid || itemRow.name;

        frappe.call({
            method: "pyro.api.get_multipoint_summary",
            args: {
                parent_doctype: frm.doc.doctype,
                parent_name: frm.doc.name,
                item_row: item_row_key
            },
            callback: function (r) {
                let points = r.message || [];
                if (!points.length) {
                    frappe.msgprint("No multipoint data saved for this item yet.");
                    return;
                }

                // Sl No, TT Tag, TE Tag, TW Tag, Point No, then measurements — matches print layout
                let headerCells = `<th>Sl No</th><th>TT Tag</th><th>TE Tag</th><th>TW Tag</th><th>Point No</th>
                    <th>Hot Junction Location mm</th><th>Head Extension N mm</th>
                    <th>Lagging Extension T mm</th><th>Overall Length OL mm</th>`;

                let bodyRows = points.map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${p.tt_tag_number || ""}</td>
                        <td>${p.te_tag_number || ""}</td>
                        <td>${p.tw_tag_number || ""}</td>
                        <td>${p.point_no || ""}</td>
                        <td>${p.hot_junction_location_mm || ""}</td>
                        <td>${p.head_extension_n_mm || ""}</td>
                        <td>${p.lagging_extension_t_mm || ""}</td>
                        <td>${p.overall_length_ol_mm || ""}</td>
                    </tr>
                `).join("");

                let html = `
                    <div style="margin-bottom:10px;">
                        <b>Item:</b> ${itemRow.item_code || ""} — ${itemRow.item_name || ""}
                        &nbsp;|&nbsp; <b>Total Points:</b> ${points.length}
                    </div>
                    <div style="overflow-x:auto; border:1px solid #d1d8dd;">
                        <table class="table table-bordered" style="margin-bottom:0;">
                            <thead style="background:#f5f7fa;"><tr>${headerCells}</tr></thead>
                            <tbody>${bodyRows}</tbody>
                        </table>
                    </div>
                `;

                let viewDialog = new frappe.ui.Dialog({
                    title: "Multipoint Details - " + (itemRow.item_code || ""),
                    size: "large",
                    fields: [{ fieldname: "summary_html", fieldtype: "HTML", options: html }]
                });
                viewDialog.show();
            }
        });
    }
};