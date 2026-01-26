frappe.listview_settings['Service Schedules'] = {
    onload: function(listview) {
        // ---------------- COPY (BULK SYNC/CREATE) BUTTON ----------------
        listview.page.add_action_item(__("Copy to"), function() {
            const selected_items = listview.get_checked_items();

            if (selected_items.length === 0) {
                frappe.msgprint(__("Please select at least one document to copy."));
                return;
            }

            const names = selected_items.map(item => item.name);

            frappe.confirm(
                __("Are you sure you want to process {0} selected documents? This will update matching intervals or create new ones.", [selected_items.length]),
                function() {
                    frappe.dom.freeze(__("Processing Bulk Sync..."));
                    
                    frappe.call({
                        method: "edp_online_vehicles.events.shedule.bulk_sync_by_interval", // UPDATE THIS PATH
                        args: {
                            source_names: names
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
            );
        });       
    }
};
