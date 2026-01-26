frappe.listview_settings['Service Schedules'] = {
    onload: function(listview) {
        listview.page.add_action_item(__("Copy to"), function() {
            const selected_items = listview.get_checked_items();

            if (selected_items.length === 0) {
                frappe.msgprint(__("Please select at least one document to copy."));
                return;
            }

            const names = selected_items.map(item => item.name);

            // Show dialog to select target model
            let dialog = new frappe.ui.Dialog({
                title: __("Copy Service Schedules"),
                fields: [
                    {
                        label: __("Target Model"),
                        fieldname: "target_model",
                        fieldtype: "Link",
                        options: "Model Administration",
                        reqd: 1,
                        get_query: function() {
                            return {
                                filters: {}
                            };
                        }
                    }
                ],
                primary_action_label: __("Confirm"),
                primary_action: function(values) {
                    if (!values.target_model) {
                        frappe.msgprint(__("Please select a target model."));
                        return;
                    }

                    dialog.hide();
                    frappe.dom.freeze(__("Copying Service Schedules..."));

                    frappe.call({
                        method: "edp_online_vehicles.events.service_schedules.copy_to_target_model",
                        args: {
                            source_names: names,
                            target_model: values.target_model
                        },
                        callback: function(r) {
                            frappe.dom.unfreeze();
                            if (r.message) {
                                let msg = __("Process Complete: {0} updated, {1} created.", [r.message.updated_count, r.message.created_count]);
                                if (r.message.errors.length > 0) {
                                    msg += "<br><br>" + __("Errors:") + "<br>" + r.message.errors.join("<br>");
                                }
                                frappe.msgprint(msg);
                            }
                            listview.refresh();
                        },
                        error: function() {
                            frappe.dom.unfreeze();
                        }
                    });
                }
            });

            dialog.show();
        });       
    }
};
