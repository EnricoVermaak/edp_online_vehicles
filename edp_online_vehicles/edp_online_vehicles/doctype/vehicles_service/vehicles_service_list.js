frappe.listview_settings['Vehicles Service'] = {
       onload(listview) {
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

        // Status column ko service_status se replace kar do
        listview.columns = listview.columns.map(col => {
            if (col.df && col.df.fieldname === "status") {
                col.df.fieldname = "service_status";
                col.df.label = "Status";
                col.df.fieldtype = "Select";
            }
            return col;
        });

        // Agar service_status column nahi mila to add kar do (pehli baar ke liye)
        if (!listview.columns.find(c => c.df && c.df.fieldname === "service_status")) {
            listview.columns.splice(1, 0, {  // title ke baad daal do
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
            return `<span class="indicator-pill ${color}">${value}</span>`;
        }
    }
    
};
