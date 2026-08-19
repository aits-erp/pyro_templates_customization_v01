frappe.call({
    method: "pyro.api.get_configured_child_tables",
    callback: function (r) {
        (r.message || []).forEach(function (map) {
            frappe.ui.form.on(map.parent, {
                refresh: function (frm) {
                    if (frm.custom_buttons && frm.custom_buttons["Load Pyro Template"]) return;
                    frm.add_custom_button("Load Pyro Template", function () {
                        frappe.call({
                            method: "pyro.api.get_templates_for",
                            args: { reference_doctype: map.options },
                            callback: function (res) {
                                let templates = res.message || [];
                                if (!templates.length) {
                                    frappe.msgprint(`No Pyro Series Config found for ${map.options}`);
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
            });
        });
    }
});