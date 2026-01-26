frappe.listview_settings['Service Schedules'] = {
    onload: function(listview) {
        // ---------------- COPY (SYNC/CREATE) BUTTON ----------------
        listview.page.add_action_item(__("Copy"), function() {
            const selected_items = listview.get_checked_items();

            if (selected_items.length === 0) {
                frappe.msgprint(__("Please select at least one document to copy from."));
                return;
            }

            if (selected_items.length > 1) {
                frappe.msgprint(__("Please select only one document as the source."));
                return;
            }

            const source_name = selected_items[0].name;
            const interval = selected_items[0].interval;

            frappe.confirm(
                __("Copy data from {0} (Interval: {1})? This will update existing matches or create a new document.", [source_name, interval]),
                function() {
                    process_copy_logic(source_name, listview);
                }
            );
        });

        // ---------------- EDIT BUTTON ----------------
        listview.page.add_action_item(__("Edit"), function() {
            const selected_items = listview.get_checked_items();
            if (selected_items.length === 1) {
                frappe.set_route("Form", "Service Schedules", selected_items[0].name);
            } else {
                frappe.msgprint(__("Please select exactly one document to edit."));
            }
        });
    }
};

function process_copy_logic(source_name, listview) {
    frappe.dom.freeze(__("Processing..."));

    // 1. Get the full source document to ensure all child tables are loaded
    frappe.db.get_doc('Service Schedules', source_name).then(source_doc => {
        
        // 2. Check for other documents with the same interval
        frappe.db.get_list('Service Schedules', {
            filters: {
                interval: source_doc.interval,
                name: ['!=', source_name]
            },
            fields: ['name']
        }).then(target_list => {
            
            if (target_list.length === 0) {
                // SCENARIO: NO MATCH FOUND -> CREATE NEW DOCUMENT
                create_new_document(source_doc, listview);
            } else {
                // SCENARIO: MATCHES FOUND -> UPDATE EXISTING DOCUMENTS
                update_existing_documents(source_doc, target_list, listview);
            }
        });
    }).catch(() => {
        frappe.dom.unfreeze();
        frappe.msgprint(__("Error fetching source document."));
    });
}

function create_new_document(source_doc, listview) {
    let new_doc = JSON.parse(JSON.stringify(source_doc));
    
    // Clean identity fields
    delete new_doc.name;
    delete new_doc.creation;
    delete new_doc.modified;
    delete new_doc.modified_by;
    delete new_doc.owner;
    new_doc.docstatus = 0;

    // Clean child tables
    const child_tables = ['service_parts_items', 'service_labour_items'];
    child_tables.forEach(table => {
        if (new_doc[table]) {
            new_doc[table].forEach(row => {
                delete row.name;
                delete row.parent;
            });
        }
    });

    frappe.call({
        method: 'frappe.desk.form.save.savedocs',
        args: {
            doc: JSON.stringify(new_doc),
            action: 'Save'
        },
        callback: function(r) {
            frappe.dom.unfreeze();
            frappe.show_alert({ message: __("New document created successfully."), indicator: 'green' });
            listview.refresh();
        },
        error: function() {
            frappe.dom.unfreeze();
        }
    });
}

function update_existing_documents(source_doc, target_list, listview) {
    let success_count = 0;
    let error_count = 0;

    const update_next = (idx) => {
        if (idx >= target_list.length) {
            frappe.dom.unfreeze();
            frappe.msgprint(__("Update Complete: {0} updated, {1} failed.", [success_count, error_count]));
            listview.refresh();
            return;
        }

        const target_name = target_list[idx].name;

        frappe.db.get_doc('Service Schedules', target_name).then(target_doc => {
            let updated_doc = JSON.parse(JSON.stringify(target_doc));

            // Map main fields
            const fields_to_copy = [
                'model_code', 'model_description', 'period_months', 
                'allow_duplicate_services', 'allow_users_to_add_edit_remove_parts',
                'allow_users_to_add_edit_remove_labour'
            ];
            fields_to_copy.forEach(f => {
                if (source_doc[f] !== undefined) updated_doc[f] = source_doc[f];
            });

            // Handle Child Tables: CLEAR FIRST, THEN ADD
            const child_tables = ['service_parts_items', 'service_labour_items'];
            child_tables.forEach(table => {
                // Clear existing rows in target
                updated_doc[table] = []; 
                
                // Add rows from source
                if (source_doc[table]) {
                    source_doc[table].forEach(row => {
                        let new_row = JSON.parse(JSON.stringify(row));
                        delete new_row.name;
                        delete new_row.parent;
                        updated_doc[table].push(new_row);
                    });
                }
            });

            frappe.call({
                method: 'frappe.desk.form.save.savedocs',
                args: {
                    doc: JSON.stringify(updated_doc),
                    action: 'Save'
                },
                callback: function(r) {
                    success_count++;
                    update_next(idx + 1);
                },
                error: function() {
                    error_count++;
                    update_next(idx + 1);
                }
            });
        }).catch(() => {
            error_count++;
            update_next(idx + 1);
        });
    };

    update_next(0);
}
