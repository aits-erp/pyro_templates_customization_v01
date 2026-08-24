// frappe.call({
//     method: "pyro.api.get_configured_child_tables",
//     callback: function (r) {
//         (r.message || []).forEach(function (map) {
//             frappe.ui.form.on(map.parent, {
//                 refresh: function (frm) {
//                     if (frm.custom_buttons && frm.custom_buttons["Load Pyro Template"]) return;
//                     frm.add_custom_button("Load Pyro Template", function () {
//                         frappe.call({
//                             method: "pyro.api.get_templates_for",
//                             args: { reference_doctype: map.options },
//                             callback: function (res) {
//                                 let templates = res.message || [];
//                                 if (!templates.length) {
//                                     frappe.msgprint(`No Pyro Series Config found for ${map.options}`);
//                                     return;
//                                 }
//                                 frappe.prompt(
//                                     [{
//                                         fieldname: "template",
//                                         fieldtype: "Select",
//                                         label: "Choose Template",
//                                         reqd: 1,
//                                         options: templates.map(t => t.name).join("\n")
//                                     }],
//                                     (values) => {
//                                         pyro.bulk_edit.open(frm, {
//                                             child_fieldname: map.fieldname,
//                                             child_doctype: map.options,
//                                             template_name: values.template
//                                         });
//                                     },
//                                     "Select Pyro Template"
//                                 );
//                             }
//                         });
//                     });
//                 }
//             });
//         });
//     }
// });


// frappe.call({
//     method: "pyro.api.get_configured_child_tables",
//     callback: function (r) {
//         (r.message || []).forEach(function (map) {
//             frappe.ui.form.on(map.parent, {
//                 refresh: function (frm) {
//                     if (!(frm.custom_buttons && frm.custom_buttons["Load Pyro Template"])) {
//                         frm.add_custom_button("Load Pyro Template", function () {
//                             frappe.call({
//                                 method: "pyro.api.get_templates_for",
//                                 args: { reference_doctype: map.options },
//                                 callback: function (res) {
//                                     let templates = res.message || [];
//                                     if (!templates.length) {
//                                         frappe.msgprint(`No single-point Pyro template found for ${map.options}`);
//                                         return;
//                                     }
//                                     frappe.prompt(
//                                         [{
//                                             fieldname: "template",
//                                             fieldtype: "Select",
//                                             label: "Choose Template",
//                                             reqd: 1,
//                                             options: templates.map(t => t.name).join("\n")
//                                         }],
//                                         (values) => {
//                                             pyro.bulk_edit.open(frm, {
//                                                 child_fieldname: map.fieldname,
//                                                 child_doctype: map.options,
//                                                 template_name: values.template
//                                             });
//                                         },
//                                         "Select Pyro Template"
//                                     );
//                                 }
//                             });
//                         });
//                     }

//                     if (!(frm.custom_buttons && frm.custom_buttons["Load Pyro Multipoint Template"])) {
//                         frm.add_custom_button("Load Pyro Multipoint Template", function () {
//                             frappe.call({
//                                 method: "pyro.api.get_multipoint_templates_for",
//                                 args: { reference_doctype: map.options },
//                                 callback: function (res) {
//                                     let templates = res.message || [];
//                                     if (!templates.length) {
//                                         frappe.msgprint(`No multipoint Pyro template found for ${map.options}`);
//                                         return;
//                                     }
//                                     frappe.prompt(
//                                         [{
//                                             fieldname: "template",
//                                             fieldtype: "Select",
//                                             label: "Choose Multipoint Template",
//                                             reqd: 1,
//                                             options: templates.map(t => t.name).join("\n")
//                                         }],
//                                         (values) => {
//                                             pyro.multipoint_edit.open(frm, {
//                                                 child_fieldname: map.fieldname,
//                                                 child_doctype: map.options,
//                                                 template_name: values.template
//                                             });
//                                         },
//                                         "Select Multipoint Template"
//                                     );
//                                 }
//                             });
//                         });
//                     }
//                 }
//             });
//         });
//     }
// });



function render_multipoint_viewer(frm, map) {
    let field = frm.fields_dict[map.fieldname];
    if (!field || !field.$wrapper) return;

    field.$wrapper.find(".pyro-mp-viewer").remove();

    let items = (frm.doc[map.fieldname] || []).filter(r => r.name);
    let options = items.map(r =>
        `<option value="${r.custom_pyro_row_uid || r.name}">${r.item_code || "(blank)"} - ${r.item_name || ""}</option>`
    ).join("");

    let html = `
        <div class="pyro-mp-viewer" style="margin-top:12px; padding:12px; border:1px solid #d1d8dd; border-radius:6px; background:#fafbfc;">
            <label style="font-weight:600; margin-right:8px;">View Multipoint Data for Item:</label>
            <select class="form-control" style="display:inline-block; width:280px;" id="pyro-mp-item-select">
                <option value="">-- Select Item --</option>
                ${options}
            </select>
            <div id="pyro-mp-table-area" style="margin-top:12px;"></div>
        </div>
    `;
    field.$wrapper.append(html);

    field.$wrapper.find("#pyro-mp-item-select").off("change").on("change", function () {
        let item_row_key = $(this).val();
        let $area = field.$wrapper.find("#pyro-mp-table-area");
        $area.empty();
        if (!item_row_key) return;

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
                    $area.html("<div class='text-muted'>No multipoint data saved for this item yet.</div>");
                    return;
                }
                let headerCells = `<th>Point No</th><th>TT Tag</th><th>TE Tag</th><th>TW Tag</th>
                    <th>Hot Junction Location mm</th><th>Head Extension N mm</th>
                    <th>Lagging Extension T mm</th><th>Overall Length OL mm</th>`;
                let bodyRows = points.map(p => `
                    <tr>
                        <td>${p.point_no || ""}</td>
                        <td>${p.tt_tag_number || ""}</td>
                        <td>${p.te_tag_number || ""}</td>
                        <td>${p.tw_tag_number || ""}</td>
                        <td>${p.hot_junction_location_mm || ""}</td>
                        <td>${p.head_extension_n_mm || ""}</td>
                        <td>${p.lagging_extension_t_mm || ""}</td>
                        <td>${p.overall_length_ol_mm || ""}</td>
                    </tr>
                `).join("");
                $area.html(`
                    <div style="overflow-x:auto; border:1px solid #d1d8dd;">
                        <table class="table table-bordered" style="margin-bottom:0;">
                            <thead style="background:#f5f7fa;"><tr>${headerCells}</tr></thead>
                            <tbody>${bodyRows}</tbody>
                        </table>
                    </div>
                `);
            }
        });
    });
}

frappe.call({
    method: "pyro.api.get_configured_child_tables",
    callback: function (r) {
        (r.message || []).forEach(function (map) {
            frappe.ui.form.on(map.parent, {
                refresh: function (frm) {
                    render_multipoint_viewer(frm, map);

                    // Remove standard ERPNext "Update Items" button
                    frm.remove_custom_button(__("Update Items"));
                    frm.remove_custom_button(__("Update Items"), __("Actions"));

                    if (!(frm.custom_buttons && frm.custom_buttons["Load Pyro Template"])) {
                        frm.add_custom_button("Load Pyro Template", function () {
                            frappe.call({
                                method: "pyro.api.get_templates_for",
                                args: { reference_doctype: map.options },
                                callback: function (res) {
                                    let templates = res.message || [];
                                    if (!templates.length) {
                                        frappe.msgprint(`No single-point Pyro template found for ${map.options}`);
                                        return;
                                    }
                                    frappe.prompt(
                                        [{
                                            fieldname: "template",
                                            fieldtype: "Select",
                                            label: "Choose Template",
                                            reqd: 1,
                                            options: templates.map(t => t.name).join("\n")
                                        }],
                                        (values) => {
                                            pyro.bulk_edit.open(frm, {
                                                child_fieldname: map.fieldname,
                                                child_doctype: map.options,
                                                template_name: values.template
                                            });
                                        },
                                        "Select Pyro Template"
                                    );
                                }
                            });
                        });
                    }

                    if (!(frm.custom_buttons && frm.custom_buttons["Load Pyro Multipoint Template"])) {
                        frm.add_custom_button("Load Pyro Multipoint Template", function () {
                            frappe.call({
                                method: "pyro.api.get_multipoint_templates_for",
                                args: { reference_doctype: map.options },
                                callback: function (res) {
                                    let templates = res.message || [];
                                    if (!templates.length) {
                                        frappe.msgprint(`No multipoint Pyro template found for ${map.options}`);
                                        return;
                                    }
                                    frappe.prompt(
                                        [{
                                            fieldname: "template",
                                            fieldtype: "Select",
                                            label: "Choose Multipoint Template",
                                            reqd: 1,
                                            options: templates.map(t => t.name).join("\n")
                                        }],
                                        (values) => {
                                            pyro.multipoint_edit.open(frm, {
                                                child_fieldname: map.fieldname,
                                                child_doctype: map.options,
                                                template_name: values.template
                                            });
                                        },
                                        "Select Multipoint Template"
                                    );
                                }
                            });
                        });
                    }
                }
            });
        });
    }
});