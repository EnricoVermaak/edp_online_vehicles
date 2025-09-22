let records = [];

frappe.listview_settings["Head Office Vehicle Orders"] = {
	add_fields: ["status"],
	has_indicator_for_draft: true,

	// Remove before_render since it might run too late
	// Instead, load data in onload and then refresh
	onload: function (listview) {
		frappe.db
			.get_single_value("Vehicle Stock Settings", "status_filter_list")
			.then((status_string) => {
				// 2. Split into an array
				let status_filters = status_string.split(/\s*,\s*/);

				// 3. Clear any existing status filter
				listview.filter_area.remove("status");

				// 4. Add a new filter
				listview.filter_area.add(
					"Head Office Vehicle Orders",
					"status",
					"in",
					status_filters,
				);

				// 5. Refresh the list so the new filter takes effect
				listview.refresh();
			});

		// Remove actions for non-administrators
		if (
			!(
				frappe.user_roles.includes("Vehicles Administrator") ||
				frappe.user_roles.includes("System Manager")
			)
		) {
			listview.page.actions
				.find('[data-label="Edit"],[data-label="Assign To"]')
				.parent()
				.parent()
				.remove();
		}

		// Add your custom button
		var btn = listview.page.add_inner_button(
			__("Create New Order"),
			function () {
				frappe.new_doc("Vehicle Order");
			},
		);
		btn.css({
			"background-color": "green",
			color: "white",
			"border-color": "black",
		});

		if (frappe.user.has_role("Vehicles Administrator")) {
			listview.page.add_inner_button(
				__("Automatically Bulk Allocate"),
				function () {
					const selected_docs = listview.get_checked_items();

					if (selected_docs.length === 0) {
						frappe.msgprint(
							__("Please select at least one document."),
						);
						return;
					}

					frappe.confirm(
						"Please note this function will only allocate available stock. Would you like to continue?",
						() => {
							frappe.call({
								method: "edp_online_vehicles.events.bulk_allocate_orders.bulk_allocate_orders",
								args: {
									docnames: selected_docs.map(
										(doc) => doc.name,
									),
								},
							});
						},
					);
				},
				"Actions",
			);

			listview.page.add_inner_button(
				__("Import Bulk Allocation File"),
				() => {
					new frappe.ui.FileUploader({
						as_dataurl: true,
						allow_multiple: false,
						restrictions: { allowed_file_types: [".csv"] },
						on_success(file) {
							// --- FIRST PASS ---
							frappe.call({
								method: "edp_online_vehicles.events.read_allocate_file.allocate_vins_to_orders",
								args: {
									dataurl: file.dataurl,
									allocate_reserved: false,
									reserved_vins: [],
									reserved_map: {},
								},
								callback: (r) => {
									const {
										success_count = 0,
										total_count = 0,
										reserved_vins = [],
										reserved_map = {},
										mismatched_vins = [],
										assigned_vins = [],
										assigned_map = {},
									} = r.message || {};

									function showMismatchInfo() {
										if (mismatched_vins.length) {
											frappe.msgprint({
												title: __("Model Mismatch"),
												message: __(
													"The following VIN(s) were skipped because their model did not match the order: {0}",
													[
														mismatched_vins.join(
															", ",
														),
													],
												),
												indicator: "orange",
											});
										}
									}

									function showAssignedInfo() {
										if (assigned_vins.length) {
											const lines = assigned_vins.map(
												(v) => {
													return `Cannot Allocate ${v} due to it already being assigned to order ${assigned_map[v]}.`;
												},
											);
											frappe.msgprint({
												title: __("Already Assigned"),
												message: lines.join("<br>"),
												indicator: "red",
											});
										}
									}

									if (reserved_vins.length) {
										// existing reserved confirm...
										frappe.confirm(
											__(
												"Please note vehicle {0} was marked as reserved. Do you want to continue?",
												[reserved_vins.join(", ")],
											),
											() => {
												// YES → allocate reserved
												frappe.call({
													method: "edp_online_vehicles.events.read_allocate_file.allocate_vins_to_orders",
													args: {
														allocate_reserved: true,
														reserved_vins,
														reserved_map,
													},
													callback: (r2) => {
														const reserved_success =
															r2.message
																.reserved_success_count ||
															0;
														const final_success =
															success_count +
															reserved_success;
														frappe.msgprint({
															title: __(
																"Allocation Complete",
															),
															message: __(
																"{0} out of {1} VIN/Serial No’s successfully allocated",
																[
																	final_success,
																	total_count,
																],
															),
															indicator: "green",
														});
														showAssignedInfo();
														showMismatchInfo();
														listview.refresh();
													},
												});
											},
											() => {
												// NO → skip reserved
												frappe.msgprint({
													title: __(
														"Allocation Complete",
													),
													message: __(
														"{0} out of {1} VIN/Serial No’s successfully allocated",
														[
															success_count,
															total_count,
														],
													),
													indicator: "green",
												});
												showAssignedInfo();
												showMismatchInfo();
												listview.refresh();
											},
										);
									} else {
										// no reserved
										frappe.msgprint({
											title: __("Allocation Complete"),
											message: __(
												"{0} out of {1} VIN/Serial No’s successfully allocated",
												[success_count, total_count],
											),
											indicator: "green",
										});
										showAssignedInfo();
										showMismatchInfo();
										listview.refresh();
									}
								},
							});
						},
					});
				},
				"Actions",
			);
		}

		document.querySelector(".sidebar-action.show-tags").style.display =
			"none";
	},

	get_indicator: function (doc) {
		// If records is empty, force a synchronous fetch
		if (!records.length) {
			frappe.call({
				method: "frappe.client.get_list",
				async: false, // Synchronous call
				args: {
					doctype: "Vehicles Order Status",
					fields: ["name", "colour"],
				},
				callback: function (r) {
					records = r.message;
				},
			});
		}

		// Now that records should be populated, find the matching status record
		let status_record = records.find((r) => r.name === doc.status);
		if (status_record) {
			return [
				__(status_record.name),
				status_record.colour || "orange",
				"status,=," + status_record.name,
			];
		}
		// Fallback indicator if no match found
		return [__(doc.status), "grey", "status,=," + doc.status];
	},
};

function apply_custom_styles(listview) {
	if (listview.page.current_view !== "List") {
		return;
	}

	setTimeout(function () {
		if (listview.$result) {
			// Remove the flex property from the .level-right container
			listview.$result
				.find(".list-row .level-right, .list-row-head .level-right")
				.css("flex", "unset");

			// Apply custom styles for specific data cells:
			listview.$result
				.find('a.filterable[data-filter^="vinserial_no"]')
				.each(function () {
					$(this).closest("div.list-row-col").css({
						"min-width": "18ch",
						flex: "0 0 18ch",
					});
				});
			listview.$result
				.find('a.filterable[data-filter^="colour"]')
				.each(function () {
					$(this).closest("div.list-row-col").css({
						"min-width": "5ch",
						flex: "0 0 5ch",
					});
				});
			listview.$result.find(".list-subject").each(function () {
				$(this).closest("div.list-row-col").css({
					"min-width": "22ch",
					flex: "0 0 22ch",
				});
			});
			listview.$result
				.find('span[data-filter^="order_type"]')
				.each(function () {
					$(this).closest("div.list-row-col").css({
						"min-width": "15ch",
						flex: "0 0 15ch",
					});
				});
			listview.$result
				.find('span[data-filter^="status"]')
				.each(function () {
					$(this).closest("div.list-row-col").css({
						"min-width": "10ch",
						flex: "0 0 10ch",
					});
				});
			listview.$result
				.find('span[data-filter^="undefined"]')
				.each(function () {
					$(this).closest("div.list-row-col").css({
						"min-width": "10ch",
						flex: "0 0 10ch",
					});
				});

			// Adjust the header alignment to match the data rows.
			adjustHeaderAlignment(listview);

			// Observe changes in the data row widths.
			observeRowWidthChanges(listview);
		} else {
			console.warn(
				"listview.$result is undefined. Unable to apply style changes.",
			);
		}
	}, 50);
}

function adjustHeaderAlignment(listview) {
	if (!listview.$result || !listview.$result.find(".list-row").length) {
		return;
	}

	let $firstRow = listview.$result.find(".list-row").first();
	let $headerCols = listview.$result.find(".list-row-head .list-row-col");

	$firstRow.find(".list-row-col").each(function (index, dataCol) {
		let $dataCol = $(dataCol);
		let dataWidth = $dataCol.outerWidth();

		let headerCell = $headerCols.eq(index).get(0);
		if (headerCell) {
			headerCell.style.setProperty(
				"min-width",
				dataWidth + "px",
				"important",
			);
			headerCell.style.setProperty(
				"max-width",
				dataWidth + "px",
				"important",
			);
			headerCell.style.setProperty(
				"width",
				dataWidth + "px",
				"important",
			);
			headerCell.style.setProperty(
				"flex",
				"0 0 " + dataWidth + "px",
				"important",
			);
			// Remove any left offset since it may be causing the extra spacing
			headerCell.style.setProperty("left", "0px", "important");
			headerCell.style.setProperty("position", "relative", "important");
		}
	});
}

function observeRowWidthChanges(listview) {
	// Use ResizeObserver if available
	if (typeof ResizeObserver !== "undefined") {
		// Disconnect any previous observer on the listview to avoid duplicates.
		if (listview._resizeObserver) {
			listview._resizeObserver.disconnect();
		}
		const ro = new ResizeObserver(() => {
			adjustHeaderAlignment(listview);
		});
		// Observe every data row
		listview.$result.find(".list-row").each(function (index, row) {
			ro.observe(row);
		});
		// Store the observer on the listview object for later cleanup if needed.
		listview._resizeObserver = ro;
	} else {
		// Fallback: re-adjust on window resize.
		window.addEventListener("resize", function () {
			adjustHeaderAlignment(listview);
		});
	}
}
