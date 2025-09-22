function waitForHQWidgets(callback) {
	const selector = ".shortcut-widget-box[aria-label]";
	const interval = setInterval(() => {
		if (document.querySelector(selector)) {
			clearInterval(interval);
			callback();
		}
	}, 100);
}

frappe.router.on("change", () => {
	if (location.pathname.endsWith("/vehicles")) {
		if (frappe.session.user != "Administrator") {
			frappe.call({
				method: "edp_online_vehicles.events.get_hq_company.get_hq_company",
				callback: function (r) {
					if (!r.message) return;
					const hq_company = r.message;
					const default_company =
						frappe.defaults.get_default("company");

					if (hq_company === default_company) return;

					waitForHQWidgets(() => {
						const widgetLabels = [
							"Available HQ Stock",
							"HQ Reserved Stock",
						];

						widgetLabels.forEach((label) => {
							const widget = document.querySelector(
								`.shortcut-widget-box[aria-label="${label}"]`,
							);
							if (widget) {
								const container = widget.closest(".ce-block");
								if (container) {
									container.style.display = "none";
								}
							}
						});
					});
				},
			});

			// Fetch if mandatory recon is completed
			frappe.call({
				method: "edp_online_vehicles.events.recon_vehicles.check_mandatory_recon",
				callback: function (response) {
					console.log(response.message);

					if (response.message === "incomplete") {
						// Show message to user
						frappe.msgprint({
							title: __("Mandatory Recon Incomplete"),
							message: __(
								"You have not completed your mandatory recon. Access to this workspace is restricted.",
							),
							indicator: "red",
						});

						// Function to wait for elements
						function waitForContainers(callback) {
							const interval = setInterval(() => {
								const containers = document.querySelectorAll(
									".editor-js-container .col-xs-12",
								);
								if (containers.length > 0) {
									clearInterval(interval);
									callback(containers);
								}
							}, 100); // Check every 100ms
						}

						waitForContainers((containers) => {
							containers.forEach((container) => {
								// Check if the container contains a "Recon" link
								const hasReconLink = Array.from(
									container.querySelectorAll("a"),
								).some((link) =>
									link.textContent.trim().includes("Recon"),
								);

								if (hasReconLink) {
									// Hide all links except the Recon link in the "Vehicle" card
									const links =
										container.querySelectorAll("a");
									links.forEach((link) => {
										if (
											!link.textContent.includes("Recon")
										) {
											link.style.display = "none";
										}
									});
								} else {
									// Hide the entire container
									container.style.display = "none";
								}
							});
						});
					}
				},
			});
		}
	}
});
