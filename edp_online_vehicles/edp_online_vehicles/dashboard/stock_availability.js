frappe.provide("edp_online_vehicles.edp_online_vehicles_mahindrasa");

/* global edp_online_vehicles */

edp_online_vehicles.edp_online_vehicles_mahindrasa.StockAvailability = class StockAvailability {
	constructor(opts) {
		$.extend(this, opts);
		this.make();
	}
	make() {
		var me = this;
		this.start = 0;

		this.content = $(frappe.render_template("stock_availability")).appendTo(
			this.parent,
		);
		this.result = this.content.find(".result");

		this.content.on("click", ".btn-order", function () {
			handle_order($(this), "Order");
		});

		this.content.on("click", ".hq_click", function () {
			handle_stock_popup($(this), "HQ");
		});

		this.content.on("click", ".dealer_click", function () {
			handle_stock_popup($(this), "Dealer");
		});

		this.content.on("click", ".pipeline_click", function () {
			handle_stock_popup($(this), "Pipeline");
		});

		this.content.on("click", ".date_1_click", function () {
			handle_stock_popup($(this), "Date 1");
		});

		this.content.on("click", ".date_2_click", function () {
			handle_stock_popup($(this), "Date 2");
		});

		this.content.on("click", ".date_3_click", function () {
			handle_stock_popup($(this), "Date 3");
		});

		this.content.on("click", ".date_4_click", function () {
			handle_stock_popup($(this), "Date 4");
		});

		this.content.on("click", ".date_5_click", function () {
			handle_stock_popup($(this), "Date 5");
		});

		this.content.on("click", ".date_6_click", function () {
			handle_stock_popup($(this), "Date 6");
		});

		this.content.on("click", ".date_7_click", function () {
			handle_stock_popup($(this), "Date 7");
		});

		this.content.on("click", ".date_8_click", function () {
			handle_stock_popup($(this), "Date 8");
		});

		this.content.on("click", ".date_9_click", function () {
			handle_stock_popup($(this), "Date 9");
		});

		this.content.on("click", ".date_10_click", function () {
			handle_stock_popup($(this), "Date 10");
		});

		this.content.on("click", ".date_11_click", function () {
			handle_stock_popup($(this), "Date 11");
		});

		this.content.on("click", ".date_12_click", function () {
			handle_stock_popup($(this), "Date 12");
		});

		this.content.on("click", ".total_click", function () {
			handle_stock_popup($(this), "Total");
		});

		this.content.on("click", ".unconfirmed_click", function () {
			handle_stock_popup($(this), "Unconfirmed");
		});

		function handle_order(element, action) {
			let model_code = unescape(element.attr("data-model_code"));
			let model_description = unescape(element.attr("data-model"));

			if (action === "Order") {
				open_vehicle_order(model_code, model_description);
			}
		}

		function open_vehicle_order(model_code, model_description) {
			// Store the model data temporarily in localStorage
			localStorage.setItem(
				"vehicle_order_model_data",
				JSON.stringify({
					model_code: model_code,
					model_description: model_description,
				}),
			);
			// Open a new Vehicle Order
			frappe.new_doc("Vehicle Order");
		}

		function handle_stock_popup(element, action) {
			let model_code = unescape(element.attr("data-model_code"));

			if (action === "HQ") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_hq_data",
					args: {
						model: model_code,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_popup(r.message);
						}
					},
				});
			}

			if (action === "Dealer") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_dealer_data",
					args: {
						model: model_code,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_popup(r.message);
						}
					},
				});
			}

			if (action === "Pipeline") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 1") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 2") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 3") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 4") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 5") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 6") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 7") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 8") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 9") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 10") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 11") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Date 12") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
					args: {
						model: model_code,
						date: action,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}

			if (action === "Total") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_total_data",
					args: {
						model: model_code,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_popup(r.message);
						}
					},
				});
			}

			if (action === "Unconfirmed") {
				frappe.call({
					method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_unconfirmed_data",
					args: {
						model: model_code,
					},
					callback: function (r) {
						if (r.message) {
							open_vehicle_shipment_popup(r.message);
						}
					},
				});
			}
		}

		function open_vehicle_popup(vehicle_data) {
			let count = vehicle_data.length;
			let $popup = $("#vehicle-popup");

			if (!$popup.length) {
				$popup = $(`
					<style>
						#vehicle-popup {
							position: fixed;
							bottom: 0;
							left: 0;
							right: 0;
							background: #fff;
							border-top: 1px solid #ccc;
							box-shadow: 0 -2px 5px rgba(0,0,0,0.2);
							z-index: 9999;
							padding-bottom: 10px;
							padding-left: 10px;
							padding-right: 10px;
							max-height: 35vh;
							overflow-y: auto;
							resize: vertical;
						}
						#vehicle-popup .popup-header {
							display: flex;
							justify-content: space-between;
							align-items: center;
							border-bottom: 1px solid #ccc;
							padding-bottom: 5px;
							margin-bottom: 10px;
							position: sticky;
							top: 0;
							background: #fff;
							z-index: 10;
						}
						#vehicle-popup .popup-title {
							font-size: 16px;
							font-weight: bold;
						}
						#vehicle-popup .popup-count {
							margin-right: auto;
							padding-left: 10px;
							font-size: 14px;
							color: #555;
						}
						#vehicle-popup .popup-close {
							background: transparent;
							border: none;
							font-size: 18px;
							cursor: pointer;
						}
						/* Action Dropdown and search container */
						#vehicle-popup .action-container {
							display: flex;
							align-items: center;
							margin-bottom: 10px;
						}
						/* VIN search input styling */
						#vehicle-popup .vin-search {
							padding: 5px;
							border: 1px solid #ccc;
							border-radius: 5px;
						}
						/* Grouping the action button and dropdown on the right */
						#vehicle-popup .action-group {
							margin-left: auto;
							position: relative;
						}
						#vehicle-popup .action-btn,
						#vehicle-popup .view-model-btn {
							cursor: pointer;
							margin-left: 5px;
						}
						/* Dropdown menu styles */
						#vehicle-popup .dropdown-menu {
							display: none;
							position: absolute;
							top: 100%;
							left: 0;
							background-color: #fff;
							min-width: 150px;
							box-shadow: 0 8px 16px rgba(0,0,0,0.2);
							z-index: 10;
						}
						#vehicle-popup .dropdown-menu a {
							display: block;
							padding: 8px 12px;
							text-decoration: none;
							color: #000;
							cursor: pointer;
						}
						#vehicle-popup .dropdown-menu a.disabled {
							color: #999;
							pointer-events: none;
						}
						#vehicle-popup .dropdown-menu a:hover {
							background-color: #f1f1f1;
						}
						#vehicle-popup table {
							width: 100%;
						}
						#vehicle-popup th, #vehicle-popup td {
							padding: 5px;
							text-align: left;
						}
					</style>
					<div id="vehicle-popup">
						<div class="popup-header">
							<span class="popup-title">${__("Vehicle Details")}</span>
							<span class="popup-count"></span>
							<button class="popup-close">X</button>
						</div>
						<div class="action-container">
							<input type="text" class="vin-search" placeholder="${__("Search VIN/Serial No")}" />
							<div class="action-group">
								<button class="view-model-btn btn btn-primary">${__("View Model")}</button>
								<button class="action-btn btn btn-primary">${__("Action")}</button>
								<div class="dropdown-menu">
									<a class="dropdown-item allocate-order" href="#">${__("Allocate to Order")}</a>
									<a class="dropdown-item reserve" href="#">${__("Reserve")}</a>
								</div>
							</div>
						</div>
						<div class="popup-content"></div>
					</div>
				`);
				$(".page-body").append($popup);

				$popup.find(".popup-close").on("click", function () {
					$popup.remove();
				});

				$popup.find(".allocate-order").on("click", function () {
					allocateOrderAction($popup);
				});

				$popup.find(".reserve").on("click", function () {
					reserveAction($popup);
				});

				$popup.find(".view-model-btn").on("click", function (e) {
					// Since all vehicles are the same model, use the model from the first row.
					let modelCode = $popup
						.find(".popup-content table tbody tr:first td:eq(2)")
						.text()
						.trim();
					if (!modelCode) {
						alert("Unable to retrieve model details.");
						return;
					}
					open_model_popup(modelCode);
				});

				// Toggle dropdown on action button click
				$popup.find(".action-btn").on("click", function (e) {
					e.stopPropagation();
					let $btn = $(this);
					let $menu = $btn.siblings(".dropdown-menu");

					if ($menu.is(":visible")) {
						$menu.hide();
						return;
					}

					let btnPos = $btn.position();
					let btnHeight = $btn.outerHeight();
					let desiredLeft = btnPos.left;

					$menu
						.css({
							top: btnPos.top + btnHeight,
							left: desiredLeft,
						})
						.show();

					let menuRect = $menu[0].getBoundingClientRect();
					let viewportWidth = $(window).width();
					if (menuRect.right > viewportWidth) {
						let shift = menuRect.right - viewportWidth + 5;
						$menu.css({ left: desiredLeft - shift });
					}
				});

				// Hide dropdown when clicking elsewhere
				$(document).on("click", function () {
					$popup.find(".dropdown-menu").hide();
				});

				// Hide the action button if the user's default company is not the Head Office company
				let user_company = frappe.defaults.get_user_default("Company");
				frappe.db.get_value(
					"Company",
					{ custom_head_office: 1 },
					"name",
					function (r) {
						if (r && r.name && r.name !== user_company) {
							$popup.find(".action-btn").hide();
						}
					},
				);
			}

			// Build table HTML with a checkbox column
			let html = `<table class="table table-bordered">
				<thead>
					<tr>
						<th><input type="checkbox" id="select-all"></th>
						<th>${__("Range")}</th>
						<th>${__("Model Code")}</th>
						<th>${__("Model Description")}</th>
						<th>${__("Stock #")}</th>
						<th>${__("Vin/Serial No")}</th>
						<th>${__("Dealer")}</th>
						<th>${__("Colour")}</th>
					</tr>
				</thead>
				<tbody>`;

			vehicle_data.forEach(function (row) {
				let vin = row["Vin/Serial No"] || "";
				let disabledAttr = vin ? "" : "disabled";
				html += `<tr>
					<td><input type="checkbox" class="vehicle-checkbox" ${disabledAttr}></td>
					<td>${row.Range || ""}</td>
					<td>${row.Model || ""}</td>
					<td>${row.Description || ""}</td>
					<td>${row["Stock No"] || ""}</td>
					<td class="vinserial_no">${vin}</td>
					<td>${row.Dealer || ""}</td>
					<td>${row.Colour || ""}</td>
				</tr>`;
			});
			html += `</tbody></table>`;

			$popup.find(".popup-content").html(html);
			$popup.find(".popup-count").text(`${count} ${__("Vehicles")}`);

			// "Select all" checkbox event handler: only select checkboxes that are not disabled
			$popup.find("#select-all").on("change", function () {
				let checked = $(this).prop("checked");
				$popup
					.find(".vehicle-checkbox:not(:disabled)")
					.prop("checked", checked);
				updateActionDropdownState();
			});

			$popup.find(".vehicle-checkbox").on("change", function () {
				updateActionDropdownState();
			});

			function updateActionDropdownState() {
				let checkedCount = $popup.find(
					".vehicle-checkbox:checked",
				).length;
				let $allocate = $popup.find(".dropdown-menu .allocate-order");

				if (checkedCount > 1) {
					$allocate.addClass("disabled");
				} else {
					$allocate.removeClass("disabled");
				}
			}

			// VIN/Serial No search filtering
			$popup.find(".vin-search").on("keyup", function () {
				let searchValue = $(this).val().toLowerCase();
				let $tableBody = $popup.find(".popup-content table tbody");
				let visibleCount = 0;

				$tableBody.find("tr").each(function () {
					let $row = $(this);
					if ($row.hasClass("no-match")) return;
					let vinText = $row
						.find(".vinserial_no")
						.text()
						.toLowerCase();
					if (vinText.indexOf(searchValue) !== -1) {
						$row.show();
						visibleCount++;
					} else {
						$row.hide();
					}
				});

				$tableBody.find("tr.no-match").remove();
				$popup
					.find(".popup-count")
					.text(`${visibleCount} ${__("Vehicles")}`);

				if (visibleCount === 0) {
					let colCount = $popup.find(
						".popup-content table thead th",
					).length;
					$tableBody.append(
						`<tr class="no-match"><td colspan="${colCount}" style="text-align: center;">${__(
							"No matching VIN/Serial No found",
						)}</td></tr>`,
					);
				}
			});

			$popup.show();
		}

		function open_vehicle_shipment_popup(vehicle_data) {
			let count = vehicle_data.length;
			let $popup = $("#vehicle-popup");

			if (!$popup.length) {
				$popup = $(`
					<style>
						#vehicle-popup {
							position: fixed;
							bottom: 0;
							left: 0;
							right: 0;
							background: #fff;
							border-top: 1px solid #ccc;
							box-shadow: 0 -2px 5px rgba(0,0,0,0.2);
							z-index: 9999;
							padding-bottom: 10px;
							padding-left: 10px;
							padding-right: 10px;
							max-height: 35vh;
							overflow-y: auto;
						}
						#vehicle-popup .popup-header {
							display: flex;
							justify-content: space-between;
							align-items: center;
							border-bottom: 1px solid #ccc;
							padding-bottom: 5px;
							margin-bottom: 10px;
							position: sticky;
							top: 0;
							background: #fff;
							z-index: 10;
						}
						#vehicle-popup .popup-title {
							font-size: 16px;
							font-weight: bold;
						}
						#vehicle-popup .popup-count {
							margin-right: auto;
							padding-left: 10px;
							font-size: 14px;
							color: #555;
						}
						#vehicle-popup .popup-close {
							background: transparent;
							border: none;
							font-size: 18px;
							cursor: pointer;
						}
						/* Action Dropdown and search container */
						#vehicle-popup .action-container {
							display: flex;
							align-items: center;
							margin-bottom: 10px;
						}
						/* VIN search input styling */
						#vehicle-popup .vin-search {
							padding: 5px;
							border: 1px solid #ccc;
							border-radius: 5px;
						}
						/* Grouping the action button and dropdown on the right */
						#vehicle-popup .action-group {
							margin-left: auto;
							position: relative;
						}
						#vehicle-popup .view-model-btn,
						#vehicle-popup .action-btn {
							cursor: pointer;
							margin-left: 5px;
						}
						/* Dropdown menu styles */
						#vehicle-popup .dropdown-menu {
							display: none;
							position: absolute;
							top: 100%;
							left: 0;
							background-color: #fff;
							min-width: 150px;
							box-shadow: 0 8px 16px rgba(0,0,0,0.2);
							z-index: 10;
						}
						#vehicle-popup .dropdown-menu a {
							display: block;
							padding: 8px 12px;
							text-decoration: none;
							color: #000;
							cursor: pointer;
						}
						#vehicle-popup .dropdown-menu a.disabled {
							color: #999;
							pointer-events: none;
						}
						#vehicle-popup .dropdown-menu a:hover {
							background-color: #f1f1f1;
						}
						#vehicle-popup table {
							width: 100%;
						}
						#vehicle-popup th, #vehicle-popup td {
							padding: 5px;
							text-align: left;
						}
					</style>
					<div id="vehicle-popup">
						<div class="popup-header">
							<span class="popup-title">${__("Vehicle Details")}</span>
							<span class="popup-count"></span>
							<button class="popup-close">X</button>
						</div>
						<div class="action-container">
							<input type="text" class="vin-search" placeholder="${__("Search VIN/Serial No")}" />
							<div class="action-group">
								<button class="view-model-btn btn btn-primary">${__("View Model")}</button>
								<button class="action-btn btn btn-primary">${__("Action")}</button>
								<div class="dropdown-menu">
									<a class="dropdown-item allocate-order" href="#">${__("Allocate to Order")}</a>
									<a class="dropdown-item reserve" href="#">${__("Reserve")}</a>
								</div>
							</div>
						</div>
						<div class="popup-content"></div>
					</div>
				`);
				$(".page-body").append($popup);

				$popup.find(".popup-close").on("click", function () {
					$popup.remove();
				});

				$popup.find(".allocate-order").on("click", function () {
					allocateOrderAction($popup);
				});

				$popup.find(".reserve").on("click", function () {
					reserveAction($popup);
				});

				// Add View Model button handler
				$popup.find(".view-model-btn").on("click", function (e) {
					// Get the model from the first row of the table (all vehicles use the same model)
					let modelCode = $popup
						.find(".popup-content table tbody tr:first td:eq(2)")
						.text()
						.trim();
					if (!modelCode) {
						alert("Unable to retrieve model details.");
						return;
					}
					open_model_popup(modelCode);
				});

				// Toggle dropdown on action button click
				$popup.find(".action-btn").on("click", function (e) {
					e.stopPropagation();
					let $btn = $(this);
					let $menu = $btn.siblings(".dropdown-menu");

					if ($menu.is(":visible")) {
						$menu.hide();
						return;
					}

					let btnPos = $btn.position();
					let btnHeight = $btn.outerHeight();
					let desiredLeft = btnPos.left;

					$menu
						.css({
							top: btnPos.top + btnHeight,
							left: desiredLeft,
						})
						.show();

					let menuRect = $menu[0].getBoundingClientRect();
					let viewportWidth = $(window).width();
					if (menuRect.right > viewportWidth) {
						let shift = menuRect.right - viewportWidth + 5;
						$menu.css({ left: desiredLeft - shift });
					}
				});

				$(document).on("click", function () {
					$popup.find(".dropdown-menu").hide();
				});

				// Hide the action button if the user's default company is not the Head Office company
				let user_company = frappe.defaults.get_user_default("Company");
				frappe.db.get_value(
					"Company",
					{ custom_head_office: 1 },
					"name",
					function (r) {
						if (r && r.name && r.name !== user_company) {
							$popup.find(".action-btn").hide();
						}
					},
				);
			}

			// Build table HTML with a checkbox column
			let html = `<table class="table table-bordered">
				<thead>
					<tr>
						<th><input type="checkbox" id="select-all"></th>
						<th>${__("Range")}</th>
						<th>${__("Model")}</th>
						<th>${__("Stock #")}</th>
						<th>${__("Vin/Serial No")}</th>
						<th>${__("ETA Date")}</th>
					</tr>
				</thead>
				<tbody>`;

			vehicle_data.forEach(function (row) {
				let vin = row["Vin/Serial No"] || "";
				let disabledAttr = vin ? "" : "disabled";
				html += `<tr>
					<td><input type="checkbox" class="vehicle-checkbox" ${disabledAttr}></td>
					<td>${row.Range || ""}</td>
					<td>${row.Model || ""}</td>
					<td>${row["Stock No"] || ""}</td>
					<td class="vinserial_no">${vin}</td>
					<td>${row["ETA Date"] || ""}</td>
				</tr>`;
			});
			html += `</tbody></table>`;

			$popup.find(".popup-content").html(html);
			$popup.find(".popup-count").text(`${count} ${__("Vehicles")}`);

			$popup.find("#select-all").on("change", function () {
				let checked = $(this).prop("checked");
				$popup
					.find(".vehicle-checkbox:not(:disabled)")
					.prop("checked", checked);
				updateActionDropdownState();
			});

			$popup.find(".vehicle-checkbox").on("change", function () {
				updateActionDropdownState();
			});

			function updateActionDropdownState() {
				let checkedCount = $popup.find(
					".vehicle-checkbox:checked",
				).length;
				let $allocate = $popup.find(".dropdown-menu .allocate-order");
				if (checkedCount > 1) {
					$allocate.addClass("disabled");
				} else {
					$allocate.removeClass("disabled");
				}
			}

			// VIN/Serial No search filtering
			$popup.find(".vin-search").on("keyup", function () {
				let searchValue = $(this).val().toLowerCase();
				let $tableBody = $popup.find(".popup-content table tbody");
				let visibleCount = 0;

				$tableBody.find("tr").each(function () {
					let $row = $(this);
					if ($row.hasClass("no-match")) return;
					let vinText = $row
						.find(".vinserial_no")
						.text()
						.toLowerCase();
					if (vinText.indexOf(searchValue) !== -1) {
						$row.show();
						visibleCount++;
					} else {
						$row.hide();
					}
				});

				$tableBody.find("tr.no-match").remove();
				$popup
					.find(".popup-count")
					.text(`${visibleCount} ${__("Vehicles")}`);

				if (visibleCount === 0) {
					let colCount = $popup.find(
						".popup-content table thead th",
					).length;
					$tableBody.append(
						`<tr class="no-match"><td colspan="${colCount}" style="text-align: center;">${__(
							"No matching VIN/Serial No found",
						)}</td></tr>`,
					);
				}
			});

			$popup.show();
		}

		function open_model_popup(modelCode) {
			// Retrieve model data using frappe.call
			frappe.call({
				method: "edp_online_vehicles.events.get_model_data.get_model_data",
				args: { modelname: modelCode },
				callback: function (response) {
					if (response.message) {
						let modelData = response.message;
						// Build an array of images (front, rear, left, right)
						let images = [];
						if (modelData.front_image)
							images.push({
								label: "Front",
								url: modelData.front_image,
							});
						if (modelData.rear_image)
							images.push({
								label: "Rear",
								url: modelData.rear_image,
							});
						if (modelData.left_image)
							images.push({
								label: "Left",
								url: modelData.left_image,
							});
						if (modelData.right_image)
							images.push({
								label: "Right",
								url: modelData.right_image,
							});

						// Create the modal HTML with an image gallery and model details table
						let modalHtml = $(`
							<style>
								#model-popup-overlay {
									position: fixed;
									top: 0;
									left: 0;
									width: 100vw;
									height: 100vh;
									background: rgba(0,0,0,0.5);
									z-index: 10000;
								}
								#model-popup {
									position: fixed;
									top: 50%;
									left: 50%;
									transform: translate(-50%, -50%);
									background: #fff;
									padding: 20px;
									box-shadow: 0 4px 10px rgba(0,0,0,0.3);
									max-height: 90vh;
									overflow-y: auto;
								}
								#model-popup .model-close {
									position: absolute;
									top: 10px;
									right: 10px;
									background: transparent;
									border: none;
									font-size: 18px;
									cursor: pointer;
								}
								/* Gallery styles */
								.model-gallery {
									position: relative;
									text-align: center;
								}
								.model-gallery img {
									object-fit: contain;
								}
								.model-gallery .gallery-label {
									position: absolute;
									top: 10px;
									left: 10px;
									background: rgba(0,0,0,0.6);
									color: #fff;
									padding: 5px 10px;
									font-size: 14px;
								}
								.model-gallery .gallery-arrow {
									position: absolute;
									top: 50%;
									transform: translateY(-50%);
									font-size: 24px;
									color: rgba(0,0,0,0.5);
									cursor: pointer;
									display: none;
								}
								.model-gallery .left-arrow {
									left: 10px;
								}
								.model-gallery .right-arrow {
									right: 10px;
								}
								.model-gallery:hover .gallery-arrow {
									display: block;
								}
								/* Dots */
								.gallery-dots {
									text-align: center;
									margin-top: 10px;
								}
								.gallery-dots .dot {
									display: inline-block;
									width: 10px;
									height: 10px;
									border-radius: 50%;
									background: #ccc;
									margin: 0 5px;
									cursor: pointer;
								}
								.gallery-dots .dot.active {
									background: #333;
								}
								/* Model details table styling: same as popup table */
								.model-details table {
									width: 100%;
									border-collapse: collapse;
									margin-top: 20px;
								}
								.model-details th, .model-details td {
									padding: 5px;
									border: 1px solid #ccc;
									text-align: left;
								}
								/* Message style for missing image */
								.no-image-message {
									padding: 20px;
									font-size: 16px;
									color: #555;
								}
							</style>
							<div id="model-popup-overlay">
								<div id="model-popup">
									<button class="model-close">X</button>
									<div class="model-gallery">
										<div class="gallery-label"></div>
										<img class="gallery-image" src="" alt="Model Image" style="display:none;">
										<div class="gallery-arrow left-arrow">&lt;</div>
										<div class="gallery-arrow right-arrow">&gt;</div>
										<div class="gallery-dots"></div>
										<div class="no-image-message" style="display:none;">No Image</div>
									</div>
									<div class="model-details">
										<table>
											<tbody>
												<tr><th>Model Code</th><td>${modelData.model_code || ""}</td></tr>
												<tr><th>Description</th><td>${modelData.description || ""}</td></tr>
												<tr><th>Model Year</th><td>${modelData.model_year || ""}</td></tr>
												<tr><th>Range</th><td>${modelData.range || ""}</td></tr>
												<tr><th>Category</th><td>${modelData.category || ""}</td></tr>
												<tr><th>Class</th><td>${modelData.class || ""}</td></tr>
												<tr><th>M&M Code</th><td>${modelData.mm_code || ""}</td></tr>
												<tr><th>Dealer Billing</th><td>${modelData.dealer_billing || ""}</td></tr>
												<tr><th>Suggested Retail</th><td>${modelData.suggested_retail || ""}</td></tr>
												<tr><th>Engine Displacement</th><td>${modelData.engine_displacement || ""}</td></tr>
											</tbody>
										</table>
									</div>
								</div>
							</div>
						`);

						$("body").append(modalHtml);

						let currentIndex = 0;
						const $galleryImage = modalHtml.find(".gallery-image");
						const $galleryLabel = modalHtml.find(".gallery-label");
						const $dotsContainer = modalHtml.find(".gallery-dots");
						const $noImageMessage =
							modalHtml.find(".no-image-message");

						function updateGallery() {
							// If there are no images, show a message.
							if (images.length === 0) {
								$galleryImage.hide();
								$noImageMessage.show();
								$galleryLabel.text("");
								$dotsContainer.empty();
								$("#model-popup").css({ width: "300px" });
								return;
							}

							$noImageMessage.hide();
							$galleryImage.show();

							let imgObj = images[currentIndex];
							$galleryImage.attr("src", imgObj.url);
							$galleryLabel.text(
								imgObj.label +
									" Image (" +
									(currentIndex + 1) +
									" of " +
									images.length +
									")",
							);
							$dotsContainer
								.find(".dot")
								.removeClass("active")
								.eq(currentIndex)
								.addClass("active");

							// Adjust modal size after the image loads.
							$galleryImage.off("load").on("load", function () {
								let naturalWidth = this.naturalWidth;
								let naturalHeight = this.naturalHeight;
								let maxWidth = $(window).width() * 0.9; // 90% of viewport width
								let maxModalHeight = $(window).height() * 0.9; // 90% of viewport height

								// Reserve some extra space for other modal content (e.g., close button, gallery label, dots, details table)
								let extraSpace = 150;
								let availableImageHeight =
									maxModalHeight - extraSpace;

								let newWidth = Math.min(naturalWidth, maxWidth);
								let newHeight = Math.min(
									naturalHeight,
									availableImageHeight,
								);

								// Set the modal width based on the image's width.
								$("#model-popup").css({
									width: newWidth + "px",
								});
								$galleryImage.css({
									width: newWidth + "px",
									height: newHeight + "px",
								});
							});
						}

						// Populate dots for navigation
						$dotsContainer.empty();
						if (images.length > 0) {
							images.forEach((img, index) => {
								let $dot = $(`<span class="dot"></span>`);
								if (index === 0) $dot.addClass("active");
								$dot.on("click", function () {
									currentIndex = index;
									updateGallery();
								});
								$dotsContainer.append($dot);
							});
						}

						// Initialize gallery
						updateGallery();

						// Arrow navigation
						modalHtml.find(".left-arrow").on("click", function (e) {
							e.stopPropagation();
							currentIndex =
								(currentIndex - 1 + images.length) %
								images.length;
							updateGallery();
						});
						modalHtml
							.find(".right-arrow")
							.on("click", function (e) {
								e.stopPropagation();
								currentIndex =
									(currentIndex + 1) % images.length;
								updateGallery();
							});

						// Close modal actions
						modalHtml.find(".model-close").on("click", function () {
							modalHtml.remove();
						});
						modalHtml.on("click", function (e) {
							if (e.target.id === "model-popup-overlay") {
								modalHtml.remove();
							}
						});
					}
				},
			});
		}

		function allocateOrderAction($popup) {
			// Ensure exactly one vehicle is selected
			let $selectedVehicleRow = $popup
				.find(".vehicle-checkbox:checked")
				.closest("tr");
			if ($selectedVehicleRow.length !== 1) {
				frappe.msgprint(
					__("Please select exactly one vehicle to allocate."),
				);
				return;
			}

			// Extract the VIN and Model Code.
			// Adjust the cell indexes if your table layout changes.
			let vin = $selectedVehicleRow.find(".vinserial_no").text().trim();
			let modelCode = $selectedVehicleRow.find("td").eq(2).text().trim();
			let colour =
				$selectedVehicleRow.find("td").eq(7).text().trim() || "";

			// Create the Frappe dialog
			let d = new frappe.ui.Dialog({
				title: __("Allocate Vehicle to Order"),
				fields: [
					{
						fieldname: "order_link",
						label: __("Head Office Vehicle Orders ID"),
						fieldtype: "Link",
						options: "Head Office Vehicle Orders",
						get_query: () => {
							return {
								filters: {
									status: "Pending",
									vinserial_no: "",
									model: modelCode,
									colour: colour,
								},
							};
						},
					},
					{
						fieldname: "vinserial_no",
						label: __("VIN/Serial No"),
						fieldtype: "Data",
						default: vin,
						read_only: 1,
					},
					{
						fieldname: "model_code",
						label: __("Model"),
						fieldtype: "Data",
						default: modelCode,
						read_only: 1,
					},
				],
				primary_action_label: __("Allocate"),
				primary_action: (values) => {
					frappe.call({
						method: "edp_online_vehicles.events.stock_availability.allocate_vinno",
						args: {
							hq_order_doc: values.order_link,
							vinno: values.vinserial_no,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(r.message);
							}
						},
					});

					d.hide();
				},
			});

			d.show();
			$popup.remove();
		}

		function reserveAction($popup) {
			// Ensure at least one vehicle is selected
			let $selectedVehicleRows = $popup
				.find(".vehicle-checkbox:checked")
				.closest("tr");
			if ($selectedVehicleRows.length === 0) {
				frappe.msgprint(__("Please select at least one vehicle"));
				return;
			}

			// Extract the VIN numbers and dealer values from each selected row
			let vins = [];
			let dealers = [];
			$selectedVehicleRows.each(function () {
				let vin = $(this).find(".vinserial_no").text().trim();
				vins.push(vin);
				// Assuming the dealer is in the 7th column (index 6)
				let dealer = $(this).find("td").eq(6).text().trim();
				dealers.push(dealer);
			});

			// If all selected vehicles have the same dealer, use that as the default; otherwise, leave it empty.
			let defaultDealer = dealers.every((d) => d === dealers[0])
				? dealers[0]
				: "";

			// Create the Frappe dialog for reserving vehicles
			const dialog = new frappe.ui.Dialog({
				title: __("Reserve Stock"),
				fields: [
					{
						label: __("Dealer"),
						fieldname: "dealer",
						fieldtype: "Link",
						options: "Company",
						default: defaultDealer,
						reqd: 1,
					},
					{
						label: __("Customer"),
						fieldname: "customer",
						fieldtype: "Link",
						options: "Dealer Customer",
					},
					{
						label: __("Status"),
						fieldname: "status",
						fieldtype: "Select",
						options: ["Reserved"],
						default: "Reserved",
						read_only: 1,
					},
					{
						label: __("Reserve Reason"),
						fieldname: "reserve_reason",
						fieldtype: "Small Text",
						reqd: 1,
					},
					{
						label: __("Reserve From Date"),
						fieldname: "reserve_from_date",
						fieldtype: "Date",
						default: frappe.datetime.get_today(),
						reqd: 1,
					},
					{
						label: __("Reserve To Date"),
						fieldname: "reserve_to_date",
						fieldtype: "Date",
					},
					{
						label: __("Vehicles"),
						fieldname: "selected_Vehicles",
						fieldtype: "Table",
						read_only: 1,
						cannot_add_rows: false,
						in_place_edit: false,
						fields: [
							{
								fieldname: "vin_serial_no",
								fieldtype: "Link",
								in_list_view: 1,
								label: "VIN/ Serial No",
								options: "Vehicle Stock",
								read_only: 1,
							},
						],
						data: vins.map((v) => ({ vin_serial_no: v })),
					},
				],
				primary_action_label: __("Reserve"),
				primary_action(values) {
					if (
						values.reserve_to_date &&
						values.reserve_to_date < values.reserve_from_date
					) {
						frappe.msgprint(
							__(
								"Reserve To Date cannot be earlier than Reserve From Date.",
							),
						);
						return;
					}
					frappe.call({
						method: "edp_online_vehicles.events.create_reserve_doc.create_reserve_doc",
						args: {
							docnames: vins,
							dealer: values.dealer,
							customer: values.customer,
							status: values.status,
							reserve_reason: values.reserve_reason,
							reserve_from_date: values.reserve_from_date,
							reserve_to_date: values.reserve_to_date,
						},
						callback: function (r) {
							if (r.message) {
								frappe.msgprint(
									"Selected Vehicles have been reserved.",
								);
							}
						},
					});
					dialog.hide();
				},
			});
			dialog.show();
			$popup.remove();
		}
	}
	refresh() {
		if (this.before_refresh) {
			this.before_refresh();
		}

		var me = this;

		frappe.call({
			method: this.method,
			args: {
				model_range: this.model_range || "",
				model: this.model || "",
			},
			callback: function (r) {
				me.render(r.message);
			},
		});
	}
	// render(data) {
	// 	var me = this;

	// 	if (this.start === 0) {
	// 		this.max_count = 0;
	// 		this.result.empty();
	// 	}

	// 	let context = {};

	// 	// Get the stock data context, including max_count, etc.
	// 	context = this.get_stock_availability_dashboard_data(data, this.max_count, true);

	// 	// Fetch headers from the backend using frappe.call
	// 	frappe.call({
	// 		method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_headers.get_context",
	// 		args: { context: context },
	// 		callback: function (r) {
	// 			if (r.message) {
	// 				context.headers = r.message.headers || [];
	// 				context.hide_dealer_stock = 0
	// 				context.hide_unconfirmed_shipments = 0

	// 				frappe.db.get_single_value('Vehicle Stock Settings', 'hide_dealer_stock_availability')
	// 				.then(hide_dealer => {
	// 					if (hide_dealer) {
	// 						context.hide_dealer_stock = hide_dealer || 0
	// 					}

	// 					frappe.db.get_single_value('Vehicle Stock Settings', 'hide_unconfirmed_shipments')
	// 					.then(hide_unconfirmed_shipments => {
	// 						if (hide_unconfirmed_shipments) {
	// 							context.hide_unconfirmed_shipments = hide_unconfirmed_shipments || 0
	// 						}

	// 						if (context.data.length > 0) {
	// 							me.content.find(".result").css("text-align", "unset");
	// 							$(frappe.render_template(me.template, context)).appendTo(me.result);
	// 						} else {
	// 							var message = __("No Stock Available Currently");
	// 							me.content.find(".result").css("text-align", "center");

	// 							$(`<div class='text-muted' style='margin: 20px 5px;'>
	// 								${message} </div>`).appendTo(me.result);
	// 						}
	// 					});
	// 				});
	// 			}
	// 		},
	// 	});
	// }

	render(data) {
		const me = this;

		// Always reset at the start of a fresh fetch
		if (this.start === 0) {
			this.max_count = 0;
		}

		const context = this.get_stock_availability_dashboard_data(
			data,
			this.max_count,
			true,
		);

		frappe.call({
			method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_headers.get_context",
			args: { context },
			callback: function (r) {
				if (!r.message) return;

				context.headers = r.message.headers || [];
				context.hide_dealer_stock = 0;
				context.hide_unconfirmed_shipments = 0;

				// Chain your settings lookups
				frappe.db
					.get_single_value(
						"Vehicle Stock Settings",
						"hide_dealer_stock_availability",
					)
					.then((hide_dealer) => {
						context.hide_dealer_stock = hide_dealer || 0;
						return frappe.db.get_single_value(
							"Vehicle Stock Settings",
							"hide_unconfirmed_shipments",
						);
					})
					.then((hide_unconfirmed) => {
						context.hide_unconfirmed_shipments =
							hide_unconfirmed || 0;

						// When there's data, replace the entire container's contents
						if (context.data.length > 0) {
							me.content
								.find(".result")
								.css("text-align", "unset");
							// **Here** we clear and then insert in one step:
							me.result.html(
								`<div class="dashboard-template-wrapper">
								${frappe.render_template(me.template, context)}
							 </div>`,
							);
						} else {
							const msg = __("No Stock Available Currently");
							me.content
								.find(".result")
								.css("text-align", "center");
							me.result.html(
								`<div class='text-muted' style='margin:20px 5px;'>${msg}</div>`,
							);
						}
					});
			},
		});
	}

	get_stock_availability_dashboard_data(data, max_count, show_item) {
		if (!max_count) max_count = 0;
		if (!data) data = [];

		data.forEach(function (model_range) {
			// Determine whether the counts are in "Yes" mode by checking the type of one count field.
			// (This assumes that when hide_vehicle_amount_in_stock is enabled, individual model count values are strings.)
			var useYes = false;
			if (
				model_range.models &&
				model_range.models.length > 0 &&
				typeof model_range.models[0].hq_company === "string"
			) {
				useYes = true;
			}

			// Initialize totals. For monthly totals we always use numbers.
			if (!useYes) {
				model_range.hq_company_total = 0;
				model_range.dealers_total = 0;
				model_range.pipeline_total = 0;
				model_range.unconfirmed_shipments_total = 0;
				model_range.models_total = 0;
			} else {
				model_range.hq_company_total = "";
				model_range.dealers_total = "";
				model_range.pipeline_total = "";
				model_range.unconfirmed_shipments_total = "";
				model_range.models_total = "";
			}
			model_range.date_1_total = 0;
			model_range.date_2_total = 0;
			model_range.date_3_total = 0;
			model_range.date_4_total = 0;
			model_range.date_5_total = 0;
			model_range.date_6_total = 0;
			model_range.date_7_total = 0;
			model_range.date_8_total = 0;
			model_range.date_9_total = 0;
			model_range.date_10_total = 0;
			model_range.date_11_total = 0;
			model_range.date_12_total = 0;

			// Iterate over the models in each model_range
			model_range.models.forEach(function (model) {
				if (useYes) {
					// In "Yes mode": if any count field is "Yes", then the model's total is "Yes"
					var total =
						model.hq_company === "Yes" ||
						model.dealers === "Yes" ||
						model.pipeline === "Yes" ||
						model.unconfirmed_shipments === "Yes"
							? "Yes"
							: "";
					model.total = total;

					// At the group level, set each field to "Yes" if any model has "Yes" for that field.
					if (model.hq_company === "Yes") {
						model_range.hq_company_total = "Yes";
					}
					if (model.dealers === "Yes") {
						model_range.dealers_total = "Yes";
					}
					if (model.pipeline === "Yes") {
						model_range.pipeline_total = "Yes";
					}
					if (model.unconfirmed_shipments === "Yes") {
						model_range.unconfirmed_shipments_total = "Yes";
					}
					if (total === "Yes") {
						model_range.models_total = "Yes";
					}
				} else {
					// In numeric mode: calculate the total as the sum
					model.total =
						model.hq_company +
						model.dealers +
						model.pipeline +
						model.unconfirmed_shipments;
					model_range.hq_company_total += model.hq_company;
					model_range.dealers_total += model.dealers;
					model_range.pipeline_total += model.pipeline;
					model_range.unconfirmed_shipments_total +=
						model.unconfirmed_shipments;
					model_range.models_total += model.total;
					max_count = Math.max(model.total, max_count);
				}
				// Sum the monthly shipment counts (these are always numeric)
				model_range.date_1_total += model.date_1;
				model_range.date_2_total += model.date_2;
				model_range.date_3_total += model.date_3;
				model_range.date_4_total += model.date_4;
				model_range.date_5_total += model.date_5;
				model_range.date_6_total += model.date_6;
				model_range.date_7_total += model.date_7;
				model_range.date_8_total += model.date_8;
				model_range.date_9_total += model.date_9;
				model_range.date_10_total += model.date_10;
				model_range.date_11_total += model.date_11;
				model_range.date_12_total += model.date_12;
			});

			// If in Yes mode, convert the monthly shipment totals as well:
			if (useYes) {
				for (var i = 1; i <= 12; i++) {
					var dateField = "date_" + i + "_total";
					model_range[dateField] =
						model_range[dateField] > 0 ? "Yes" : "";
				}
			}
		});

		return {
			data: data,
			max_count: max_count,
			can_write: 1,
			show_item: show_item || false,
		};
	}
};
