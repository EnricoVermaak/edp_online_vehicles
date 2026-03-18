
frappe.query_reports["DMS Submission Tracking"] = {
	filters: [
		{
			fieldname: "view",
			label: __("View"),
			fieldtype: "Select",
			options: "Submissions\nIntegration Log",
			default: "Submissions",
			reqd: 1,
			on_change() {
				let view = frappe.query_report.get_filter_value("view");
				let parts_only = view === "Submissions";

				frappe.query_report.toggle_filter_display("dealer", !parts_only);
				frappe.query_report.toggle_filter_display("part_no", !parts_only);
				frappe.query_report.toggle_filter_display("dms_reference", !parts_only);
				frappe.query_report.toggle_filter_display("hq_part_order", !parts_only);
				frappe.query_report.toggle_filter_display("endpoint", parts_only);

				frappe.query_report.refresh();
			},
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
		{
			fieldname: "dealer",
			label: __("Dealer"),
			fieldtype: "Link",
			options: "Company",
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: "\nSuccessful\nFailed",
		},
		{
			fieldname: "part_no",
			label: __("Part No"),
			fieldtype: "Link",
			options: "Item",
		},
		{
			fieldname: "dms_reference",
			label: __("DMS Reference"),
			fieldtype: "Data",
		},
		{
			fieldname: "hq_part_order",
			label: __("HQ Part Order"),
			fieldtype: "Link",
			options: "HQ Part Order",
		},
		{
			fieldname: "endpoint",
			label: __("Integration Endpoint"),
			fieldtype: "Select",
			options: "\nEvolve - Parts Order\nEvolve - Service\nEvolve - Warranty",
			hidden: 1,
		},
	],

	formatter(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname === "integration_status" || column.fieldname === "status") {
			if (data && (data.integration_status === "Successful" || data.status === "Successful")) {
				value = `<span class="indicator-pill green">${value}</span>`;
			} else if (data && (data.integration_status === "Failed" || data.status === "Failed")) {
				value = `<span class="indicator-pill red">${value}</span>`;
			} else if (data && (data.integration_status === "Pending" || data.status === "Pending")) {
				value = `<span class="indicator-pill orange">${value}</span>`;
			}
		}

		return value;
	},
};
