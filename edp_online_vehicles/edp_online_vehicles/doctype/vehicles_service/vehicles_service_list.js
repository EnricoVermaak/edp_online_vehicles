frappe.listview_settings['Vehicles Service'] = {
       onload(listview) {
        setTimeout(() => {
            const vinHeader = $('span[data-sort-by="vin_serial_no"]');
            if (vinHeader.length) {
                vinHeader.text('Title');
                vinHeader.attr('title', 'Click to sort by Title');
            }
        }, 800);
    },
    // Overriding the indicator completely
    get_indicator(doc) {
        // Agr service_status blank hai
        if (!doc.service_status) {
            return ["No Status", "gray", "service_status,=,"];
        }

        // Custom colors for service_status
        const colors = {
            "Pending": "orange",
            "In Progress": "blue",
            "Completed": "green",
            "Canceled": "red"
        };

        // Return custom indicator
        return [
            doc.service_status,                          // Label
            colors[doc.service_status] || "blue",        // Color
            `service_status,=,${doc.service_status}`     // Filter
        ];
    }
};
