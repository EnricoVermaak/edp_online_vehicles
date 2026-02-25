var Company_logo = "/assets/edp_online_vehicles/images/logo.png";

$(".navbar-brand navbar-home").html(
	'<img class="app-logo" src="' +
		frappe.urllib.get_base_url() +
		String(Company_logo) +
		'" alt="App Logo">',
);

frappe.router.on("change", () => {
	// setTimeout(() => {
		// Get the current route
		let route = frappe.get_route();

		// If navigating to a workspace, store the workspace name in localStorage
		if (route[0] && route[0] === "Workspaces") {
			let workspace = route[1] || "";
			localStorage.setItem("last_workspace", JSON.stringify(workspace));
		}
		// If navigating to a List or Form, retrieve the last workspace and update breadcrumbs
		else if (["List", "Form"].includes(route[0])) {
			let doctype = route[1];
			let lastWorkspace = JSON.parse(
				localStorage.getItem("last_workspace") || "null",
			);

			if (lastWorkspace) {
				let slug = lastWorkspace.toLowerCase().replace(/\s+/g, "-");
				frappe.db
					.get_doc("Workspace", lastWorkspace)
					.then((doc) => {
						let found = false;
						for (let field of ["shortcuts", "links"]) {
							if (
								doc[field]?.some(
									(link) => link.link_to === doctype,
								)
							) {
								$("#navbar-breadcrumbs li:first").html(
									`<a href="/app/${slug}">${lastWorkspace}</a>`,
								);
								found = true;
								break;
							}
						}
						if (!found) {
							fetchBreadcrumbFromServer(doctype);
						}
					})
					.catch(() => {
						fetchBreadcrumbFromServer(doctype); // Fallback on error
					});
			} else {
				fetchBreadcrumbFromServer(doctype); // Fallback if nothing in localStorage
			}
		}
		else {
			fetchBreadcrumbFromServer(route[0])
		}
	// }, 50);
});

function fetchBreadcrumbFromServer(doctype) {
	console.log("is from sever");

	frappe.call({
		method: "edp_online_vehicles.events.breadcrumb.get_workspace",
		args: { doctype },
		callback: function (r) {
			if (r.message && r.message !== "None") {
				let workspace = r.message;
				localStorage.setItem(
					"last_workspace",
					JSON.stringify(workspace),
				);
				let slug = workspace.toLowerCase().replace(/\s+/g, "-");
				$("#navbar-breadcrumbs li:first").html(
					`<a href="/app/${slug}">${workspace}</a>`,
				);
			} else if (r.message === "None") {
				let workspace = "Vehicles";
				localStorage.setItem(
					"last_workspace",
					JSON.stringify(workspace),
				);
				let slug = workspace.toLowerCase().replace(/\s+/g, "-");
				$("#navbar-breadcrumbs li:first").html(
					`<a href="/app/${slug}">${workspace}</a>`,
				);
			}
		},
	});
}
