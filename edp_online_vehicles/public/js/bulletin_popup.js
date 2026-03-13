
(function () {
	let _popup_active = false;
	let _check_pending = false;

	function check_unread_bulletins() {
		if (_popup_active || _check_pending) return;
		if (frappe.session.user === "Administrator" || frappe.session.user === "Guest") return;

		_check_pending = true;

		frappe.call({
			method:
				"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.get_unread_bulletins",
			async: true,
			callback(r) {
				_check_pending = false;
				if (r.message && r.message.length > 0) {
					show_bulletin_popup(r.message);
				}
			},
			error() {
				_check_pending = false;
			},
		});
	}

	function show_bulletin_popup(bulletins) {
		_popup_active = true;

		const d = new frappe.ui.Dialog({
			title: __("Bulletins — Please Read"),
			size: "large",
			static: true,
			no_cancel_flag: true,
		});

		d.$wrapper.find(".btn-modal-close").hide();
		d.$wrapper.find(".modal-header .close").hide();

		function render(items) {
			let html = `<div class="mb-3">
				<p class="text-muted">
					Please read all bulletins below by clicking on each one.
					You must acknowledge every bulletin before this window will close.
				</p>
			</div>`;

			if (items.length === 0) {
				d.hide();
				_popup_active = false;
				return;
			}

			html += `<table class="table table-hover">
				<thead><tr>
					<th style="width:120px">${__("Date")}</th>
					<th>${__("Subject")}</th>
					<th style="width:100px">${__("Action")}</th>
				</tr></thead><tbody>`;

			for (const item of items) {
				html += `<tr>
					<td>${item.posting_date || ""}</td>
					<td>${frappe.utils.escape_html(item.bulletin_subject || item.subject)}</td>
					<td>
						<button class="btn btn-xs btn-primary bulletin-open-btn"
							data-bulletin="${item.document_name}">
							${__("Open")}
						</button>
					</td>
				</tr>`;
			}

			html += "</tbody></table>";

			d.$body.html(html);

			d.$body.find(".bulletin-open-btn").on("click", function () {
				const bulletin_name = $(this).data("bulletin");
				frappe.set_route("Form", "Bulletin", bulletin_name);

				setTimeout(function () {
					frappe.call({
						method:
							"edp_online_vehicles.edp_online_vehicles.doctype.bulletin.bulletin.get_unread_bulletins",
						async: true,
						callback(r) {
							if (r.message && r.message.length > 0) {
								render(r.message);
								d.show();
							} else {
								d.hide();
								_popup_active = false;
							}
						},
					});
				}, 2000);
			});
		}

		render(bulletins);
		d.show();

		d.onhide = function () {
			_popup_active = false;
		};
	}

	$(document).ready(function () {
		setTimeout(check_unread_bulletins, 3000);
	});

	setInterval(check_unread_bulletins, 300000);
})();
