// 1. Define cleanup
function removeVehiclePopup() {
	$("#vehicle-popup").remove();
}

frappe.router.on("change", removeVehiclePopup);

// 3. Browser popstate (Back/Forward)
window.addEventListener("popstate", removeVehiclePopup);
