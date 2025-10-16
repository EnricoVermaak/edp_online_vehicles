frappe.listview_settings['Vehicle Service Booking'] = {
    onload(listview) {
        setTimeout(() => {
            const vinHeader = $('span[data-sort-by="vin_serial_no"]');
            if (vinHeader.length) {
                vinHeader.text('Title');
                vinHeader.attr('title', 'Click to sort by Title');
            }
        }, 800);
    }
};