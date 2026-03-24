frappe.provide("edp_online_vehicles.form_utils");

const READONLY_LINK_CELL =
	'.frappe-control[data-fieldtype="Link"] .like-disabled-input, ' +
	'.frappe-control[data-fieldtype="Dynamic Link"] .like-disabled-input';

edp_online_vehicles.form_utils.disable_readonly_link_navigation = function (frm) {
	if (!frm?.wrapper) return;

	const $w = $(frm.wrapper);
	const linkSelector = `${READONLY_LINK_CELL} a[href]`;

	$w.off("click.edp_ro_link")
		.on("click.edp_ro_link", linkSelector, e => e.preventDefault());

	$w.find(READONLY_LINK_CELL).each(function () {
		const $cell = $(this).css("cursor", "default");

		$cell.find("a[href]").each(function () {
			const $a = $(this);

			$a.replaceWith(
				$("<span>", {
					class: "filterable",
					text: $a.text(),
					css: { cursor: "default" }
				})
			);
		});
	});
};