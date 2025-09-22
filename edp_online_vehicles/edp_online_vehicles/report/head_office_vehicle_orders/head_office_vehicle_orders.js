console.log("Report Resize called");

frappe.query_reports["Head Office Vehicle Orders"] = {
	onload: function (report) {
		console.log("Report Resize called");
		// listen for each render of the table (initial load + any filter/refresh)
		report.page.wrapper.on("after_datatable_render", () => {
			let grid = report.get_datatable && report.get_datatable();
			if (!grid || !grid.columns) return;

			// adjust widths per column
			grid.columns.forEach((col) => {
				switch (col.fieldname) {
					case "vinserial_no":
						col.width = 180;
						break;
					case "model":
						col.width = 240;
						break;
					case "description":
						col.width = 120;
						break;
					case "name":
						col.width = 240;
						break;
					default:
						// catch‑all for others
						col.width = 150;
				}
			});

			// re‑draw with new widths
			grid.render();
		});
	},
};
