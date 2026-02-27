frappe.listview_settings["Natis Errors"] = {
    onload: function(listview) {

        // // Run only once per page load
        // if (!listview.__natis_sync_ran) {
        //     listview.__natis_sync_ran = true;

        //     frappe.call({
        //         method: "edp_online_vehicles_mahindrasa.events.natis_table_sync.populate_natis_errors",
        //         freeze: true,
        //         freeze_message: "Syncing Natis errors...",
        //         callback: function(r) {
        //             if (r.message) {
        //                 frappe.show_alert({
        //                     message: r.message,
        //                     indicator: "green"
        //                 });
        //             }
                                        
        //             //Refresh
        //             listview.refresh();
        //         },

        //         error: function(err) {
        //             console.error("Natis sync error:", err);
        //             frappe.show_alert({
        //                 message: "Error syncing Natis errors",
        //                 indicator: "red"
        //             });
        //         }
        //     });
        // }

        // Users should not create new error records manually
        listview.page.clear_primary_action();
        listview.can_create = false;
    }
};