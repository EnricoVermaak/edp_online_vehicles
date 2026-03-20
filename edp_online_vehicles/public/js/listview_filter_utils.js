/**
 * Usage in any listview_settings file:
 *
 *   onload(listview) {
 *       edp.listview_utils.enable_strict_filters(listview);
 *   }
 *
 * Options (second arg, all optional):
 *   list_path  – the /app/<doctype> pathname for the reset-link listener
 *                (defaults to "/app/" + doctype slug)
 */
frappe.provide("edp.listview_utils");

(function () {
	const RESET_KEY = "__edp_reset_filters";
	const BOUND_FLAG = "_edp_reset_listener_bound";

	function is_empty_filter(f) {
		return (
			(f[3] === "" || f[3] == null) &&
			(f[2] === "=" || f[2] === "like")
		);
	}

	function update_badge(area) {
		if (area && area.filter_list && area.filter_list.update_filter_button) {
			area.filter_list.update_filter_button();
		}
	}

	function clear_and_refresh(listview, area, orig) {
		listview.save_view_user_settings({ filters: [] });
		return area.clear(false).then(function () {
			update_badge(area);
			return orig();
		});
	}

	function slug(doctype) {
		return doctype.toLowerCase().replace(/ /g, "-");
	}

	function bind_reset_listener(list_path) {
		if (frappe[BOUND_FLAG + list_path]) return;
		frappe[BOUND_FLAG + list_path] = true;

		document.body.addEventListener(
			"click",
			function (e) {
				var a = e.target.closest("a.link-item");
				if (!a) return;
				try {
					var href = new URL(a.href, window.location.origin);
					if (href.pathname === list_path) {
						frappe.route_options = frappe.route_options || {};
						frappe.route_options[RESET_KEY] = "1";
					}
				} catch (_) {
				}
			},
			true,
		);
	}


	edp.listview_utils.enable_strict_filters = function (listview, opts) {
		if (listview._edp_strict_filters) return;
		listview._edp_strict_filters = true;

		opts = opts || {};
		var list_path = opts.list_path || "/app/" + slug(listview.doctype);

		if (frappe.route_options) {
			listview.save_view_user_settings({ filters: [] });
		}

		var orig = listview.before_refresh.bind(listview);

		listview.before_refresh = function () {
			var ro = frappe.route_options;
			var area = this.filter_area;
			if (!area) return orig();

			var is_reset = ro && RESET_KEY in ro;
			var is_empty_opts = ro && Object.keys(ro).length === 0;

			var filters = area.get() || [];
			var only_empty =
				filters.length > 0 && filters.every(is_empty_filter);

			if (is_reset) {
				delete ro[RESET_KEY];
				if (Object.keys(ro).length === 0) frappe.route_options = null;
				return clear_and_refresh(this, area, orig);
			}

			if (is_empty_opts) {
				frappe.route_options = null;
				return clear_and_refresh(this, area, orig);
			}

			if (only_empty) {
				return clear_and_refresh(this, area, orig);
			}


			if (ro) {
				this.save_view_user_settings({ filters: [] });
			}

			return orig();
		};

		bind_reset_listener(list_path);
	};
})();
