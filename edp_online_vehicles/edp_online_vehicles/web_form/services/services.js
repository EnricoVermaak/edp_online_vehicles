frappe.ready(function () {
	if (frappe.session.user !== "Administrator") {
		checkClassPresence();
	}
});
function checkClassPresence() {
	const interval = 1000;
	const maxAttempts = 2;
	let attempts = 0;
	const timer = setInterval(function () {
		attempts++;
		const parentDiv = $(
			'.form-group[data-fieldname="show_prices_for_vehicles_service"]',
		);
		const childrenWithClass = parentDiv.find(".disabled-deselected");
		if (childrenWithClass.length > 0) {
			console.log("Class exists");
			clearInterval(timer);
			toggle_price_visibility(true);
		} else if (attempts >= maxAttempts) {
			console.log("Class does not exist after max attempts");
			clearInterval(timer);
			toggle_price_visibility(false);
		}
	}, interval);
}
function toggle_price_visibility(showPrices) {
	if (showPrices) {
		$('div[data-fieldname="service_parts_items"] .grid-row').each(
			function () {
				const row = $(this);
				row.find('div[data-fieldname="total_excl"]').hide();
				row.find('div[data-fieldname="price_excl"]').hide();
			},
		);
		$('div[data-fieldname="service_labour_items"] .grid-row').each(
			function () {
				const row = $(this);
				row.find('div[data-fieldname="total_excl"]').hide();
				row.find('div[data-fieldname="rate_hour"]').hide();
			},
		);
		$('div[data-fieldname="transaction_list"] .grid-row').each(function () {
			const row = $(this);
			row.find('div[data-fieldname="total_excl"]').hide();
			row.find('div[data-fieldname="price_per_item_excl"]').hide();
		});
		const intervalId = setInterval(function () {
			var priceControlDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="price_excl"]',
			);
			var priceper_itemDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="price_per_item_excl"]',
			);
			var hours_ControlDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="rate_hour"]',
			);
			var total_ControlDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="total_excl"]',
			);
			var partsTotalDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="parts_total_excl"]',
			);
			var laboursTotalDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="labours_total_excl"]',
			);
			var extra_costTotalDivs = document.querySelectorAll(
				'.frappe-control[data-fieldname="extra_cost_total_excl"]',
			);
			extra_costTotalDivs.forEach(function (div) {
				div.style.display = "none";
			});
			partsTotalDivs.forEach(function (div) {
				div.style.display = "none";
			});
			laboursTotalDivs.forEach(function (div) {
				div.style.display = "none";
			});
			priceControlDivs.forEach(function (div) {
				div.style.display = "none";
			});
			hours_ControlDivs.forEach(function (div) {
				div.style.display = "none";
			});
			total_ControlDivs.forEach(function (div) {
				div.style.display = "none";
			});
			priceper_itemDivs.forEach(function (div) {
				div.style.display = "none";
			});
		}, 500);
	}
	setTimeout(() => {
		$('[data-fieldname="show_prices_for_vehicles_service"]').hide();
	}, 2000);
}
