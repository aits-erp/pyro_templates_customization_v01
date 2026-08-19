// Copyright (c) 2026, Sukku and contributors
// For license information, please see license.txt


// Copyright (c) 2026, Your Name and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pyro Series Config', {
    reference_doctype: function (frm) {
        if (!frm.doc.reference_doctype) return;
        frappe.call({
            method: "pyro.api.get_doctype_fields",
            args: { doctype: frm.doc.reference_doctype },
            callback: function (r) {
                if (r.message) {
                    frm.clear_table("fields_table");
                    r.message.forEach(function (f) {
                        let row = frm.add_child("fields_table");
                        row.fieldname = f.fieldname;
                        row.label = f.label;
                        row.fieldtype = f.fieldtype;
                    });
                    frm.refresh_field("fields_table");
                    frappe.show_alert({ message: "Fields loaded", indicator: "green" });
                }
            }
        });
    },

    refresh: function (frm) {
        frm.add_custom_button("Download Fields Excel", function () {
            frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
                let rows = (frm.doc.fields_table || []).map(r => ({
                    "Fieldname": r.fieldname || "",
                    "Label": r.label || "",
                    "Field Type": r.fieldtype || "",
                    "Include": r.include ? 1 : 0
                }));
                if (!rows.length) {
                    frappe.msgprint("No fields loaded yet. Select a Reference DocType first.");
                    return;
                }
                let ws = XLSX.utils.json_to_sheet(rows);
                let wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Fields");
                XLSX.writeFile(wb, "pyro_fields_" + (frm.doc.template_name || "template") + ".xlsx");
            });
        });

        frm.add_custom_button("Upload Fields Excel", function () {
            let file_input = $('<input type="file" accept=".xlsx,.xls,.csv">');
            file_input.on("change", function (e) {
                let file = e.target.files[0];
                if (!file) return;
                frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", function () {
                    let reader = new FileReader();
                    reader.onload = function (evt) {
                        let wb = XLSX.read(evt.target.result, { type: "binary" });
                        let sheet = wb.Sheets[wb.SheetNames[0]];
                        let json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                        json.forEach(rowObj => {
                            let fname = rowObj["Fieldname"];
                            if (!fname) return;
                            let existingRow = (frm.doc.fields_table || []).find(r => r.fieldname === fname);
                            if (existingRow) {
                                existingRow.include = (rowObj["Include"] == 1 || rowObj["Include"] === true) ? 1 : 0;
                            } else {
                                let row = frm.add_child("fields_table");
                                row.fieldname = fname;
                                row.label = rowObj["Label"] || fname;
                                row.fieldtype = rowObj["Field Type"] || "Data";
                                row.include = (rowObj["Include"] == 1 || rowObj["Include"] === true) ? 1 : 0;
                            }
                        });
                        frm.refresh_field("fields_table");
                        frm.dirty();
                        frappe.show_alert({ message: "Fields updated from Excel. Click Save to keep changes.", indicator: "green" });
                    };
                    reader.readAsBinaryString(file);
                });
            });
            file_input.trigger("click");
        });
    }
});