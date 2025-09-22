frappe.router.on("change", () => {
	// runs on every page load
	const route = frappe.get_route(); // e.g. ['head-office-vehicle-orders','view','report']

	const doctype = route[1];
	const mode = route[0];
	const page = route[2];
	const rpt = route[3];

	// only proceed if we are on the generic Report view of that doctype
	if (
		mode === "List" &&
		doctype === "Head Office Vehicle Orders" &&
		page === "Report" &&
		rpt === undefined // generic view, no saved-report slug
	) {
		console.log("Default Report View code called");

		const desired = "Head Office Vehicle Orders";
		const qs = window.location.search || "";
		// redirect into your saved Builder report
		window.location.href = `/app/head-office-vehicle-orders/view/report/Head Office Vehicle Orders`;
	}
});
