            frappe.listview_settings['Vehicles Service'] = {
                onload: function(listview) {

                const company = frappe.defaults.get_default("company");

                if (company) {
                    frappe.db.get_value("Company", company, "custom_head_office")
                        .then(r => {
                            if (r.message && r.message.custom_head_office) {

                                listview.page.add_inner_button(__("Update to Remittance"), () => {
                                    show_bulk_update_dialog(listview, "Payment Request", "Remittance");
                                });

                                listview.page.add_inner_button(__("Update to Paid"), () => {
                                    show_bulk_update_dialog(listview, "Remittance", "Paid");
                                });

                            }
                        });
                }

                setTimeout(() => {
                    const vinHeader = $('span[data-sort-by="vin_serial_no"]');
                    if (vinHeader.length) {
                        vinHeader.text('Title');
                        vinHeader.attr('title', 'Click to sort by Title');
                    }
                }, 800);

                if (listview.page.fields_dict.status) {
                    listview.page.fields_dict.status.$wrapper.hide();
                }

                    listview.columns = listview.columns.map(col => {
                        if (col.df && col.df.fieldname === "status") {
                            col.df.fieldname = "service_status";
                            col.df.label = "Status";
                            col.df.fieldtype = "Select";
                        }
                        return col;
                    });

                if (!listview.columns.find(c => c.df && c.df.fieldname === "service_status")) {
                    listview.columns.splice(1, 0, {
                        type: "Field",
                        df: {
                            label: "Status",
                            fieldname: "service_status",
                            fieldtype: "Select"
                        }
                    });
                }

                listview.refresh();
            },

            formatters: {
                service_status: function(value) {
                    if (!value) return "";

                    const colors = {
                        "Pending": "orange",
                        "In Progress": "blue",
                        "In Service": "purple",
                        "Completed": "green",
                        "Rejected": "red",
                        "Cancelled": "darkgrey"
                    };

                    const color = colors[value] || "gray";
                    return `<span class="indicator-pill ${color}">${__(value)}</span>`;
                }
            }
        };

                    function show_bulk_update_dialog(listview, source_status, target_status) {

                        const d = new frappe.ui.Dialog({
                            title: __(`Bulk Update: ${target_status}`),
                            size: "large",
                            fields: [
                                {
                                    label: __("Select Dealer"),
                                    fieldname: "dealer",
                                    fieldtype: "Link",
                                    options: "Company", 
                                    reqd: 1,
                                    onchange: function() {
                                        const dealer = d.get_value("dealer");
                                        if (!dealer) {
                                            d.get_field("services_html").$wrapper.empty();
                                            return;
                                        }
                                        fetch_and_render_services(d, dealer, source_status);
                                    }
                                },
                                { 
                                    fieldtype: "HTML", 
                                    fieldname: "services_html" 
                                }
                            ],
                            primary_action_label: __(`Update to ${target_status}`),
                            primary_action() {
                                const selected = d.fields_dict.services_html.$wrapper
                                    .find('input.js-service-select:checked')
                                    .map(function() { return $(this).attr("data-name"); })
                                    .get();

                                if (!selected.length) {
                                    frappe.msgprint(__("Please select at least one service."));
                                    return;
                                }

                                frappe.confirm(`Update ${selected.length} records to ${target_status}?`, () => {
                                    frappe.call({
                                        method: "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_service.vehicles_service.bulk_update_service_status",
                                        args: {
                                            names: selected,
                                            target_status: target_status
                                        },
                                        callback: function(r) {
                                            frappe.show_alert({
                                                message: __("{0} Records Updated to {1}", [selected.length, target_status]),
                                                indicator: "green"
                                            });
                                            d.hide();
                                            listview.refresh();
                                        }
                                    });
                                });
                            }
                        });
                        d.show();
                    }

        function fetch_and_render_services(dialog, dealer, status) {
            frappe.db.get_list("Vehicles Service", {
                filters: { dealer: dealer, service_status: status },
                fields: ["name", "dealer", "service_status"]
            }).then(data => {
                const html = make_selectable_table_html(data);
                const $wrapper = dialog.fields_dict.services_html.$wrapper;
                $wrapper.html(html);

                $wrapper.off("change.select_all").on("change.select_all", ".js-select-all", function() {
                    const checked = $(this).is(":checked");
                    $wrapper.find(".js-service-select").prop("checked", checked);
                });
            });
        }

        function make_selectable_table_html(rows) {
            if (!rows.length) {
                return `<div class="text-muted text-center" style="padding: 20px;">No services found with this status.</div>`;
            }

            const body = rows.map(row => `
                <tr>
                    <td class="text-center">
                        <input type="checkbox" class="js-service-select" data-name="${row.name}">
                    </td>
                    <td>${row.name}</td>
                    <td>${row.service_status}</td>
                </tr>
            `)
            .join("");

            return `
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-bordered table-sm">
                        <thead>
                            <tr>
                                <th style="width: 40px;" class="text-center">
                                    <input type="checkbox" class="js-select-all">
                                </th>
                                <th>Service ID</th>
                                <th>Current Status</th>
                            </tr>
                        </thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            `;
        }
        