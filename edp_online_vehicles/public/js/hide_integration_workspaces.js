// frappe.router.on('change', () => {
//     console.log('Router change detected');
//     // Current logged‑in user
//     const currentUser = frappe.session.user;
//     // Only proceed for non-Administrator users
//     if (currentUser !== 'Administrator') {
//         console.log('Hiding workspaces');
//         // List of workspace routes to hide
//         const routesToHide = [
//             '/app/erpnext-settings',
//             '/app/integrations',
//             '/app/erpnext-integrations',
//             '/app/build',
//             '/app/tools'
//         ];

//         // Iterate and hide each sidebar anchor whose href matches
//         routesToHide.forEach(route => {
//             const selector = `.desk-sidebar-item a.item-anchor[href="${route}"]`;
//             console.log(selector);
//             document.querySelectorAll(selector).forEach(el => {
//                 // Hide the entire container
//                 const container = el.closest('.sidebar-item-container');
//                 console.log(container);
//                 if (container) {
//                     container.style.display = 'none';
//                 }
//             });
//         });
//     }
// });

frappe.router.on("change", () => {
	const currentUser = frappe.session.user;
	if (currentUser !== "Administrator") {
		// give the sidebar a moment to re-render
		setTimeout(() => {
			const routesToHide = [
				"/app/erpnext-settings",
				"/app/integrations",
				"/app/erpnext-integrations",
				"/app/build",
				"/app/tools",
			];
			routesToHide.forEach((route) => {
				const selector = `.desk-sidebar-item a.item-anchor[href="${route}"]`;

				document.querySelectorAll(selector).forEach((el) => {
					const container = el.closest(".sidebar-item-container");
					if (container) {
						container.style.display = "none";
					}
				});
			});
		}, 1000);
	}
});
