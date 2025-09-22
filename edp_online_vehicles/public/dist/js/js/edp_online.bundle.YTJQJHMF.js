(() => {
  // ../edp_online_vehicles/edp_online_vehicles/public/js/layout.js
  frappe.ready(function() {
    frappe.ui.form.Layout.prototype.render = function(new_fields) {
      let fields = new_fields || this.fields;
      this.section = null;
      this.column = null;
      if (this.no_opening_section() && !this.is_tabbed_layout()) {
        this.fields.unshift({ fieldtype: "Section Break" });
      }
      if (this.is_tabbed_layout()) {
        let default_tab = {
          label: __("Details"),
          fieldtype: "Tab Break",
          fieldname: "__details"
        };
        let first_field_visible = this.fields.find((element) => element.hidden == false);
        let first_tab = (first_field_visible == null ? void 0 : first_field_visible.fieldtype) === "Tab Break" ? first_field_visible : null;
        if (!first_tab) {
          this.fields.splice(0, 0, default_tab);
        } else {
          let newname_field = this.fields.find((df) => df.fieldname === "__newname");
          if (newname_field && newname_field.get_status(this) === "Write") {
            this.fields.splice(0, 1);
            this.fields.splice(1, 0, newname_field);
          }
        }
      }
      $(".web-form-header").append(`
            <div class="form-tabs-list">
                <ul class="nav form-tabs" id="form-tabs" role="tablist">
                    <li class="nav-item show">
                        <a class="nav-link active select-tab" id="details-tab" data-toggle="tab" data-fieldname="details" href="#" role="tab" aria-controls="Details" aria-selected="true">
                            Details
                        </a>
                    </li>
                </ul>
            </div>`);
      fields.forEach((df) => {
        switch (df.fieldtype) {
          case "Fold":
            this.make_page(df);
            break;
          case "Page Break":
            this.make_page_break(df);
            this.make_section(df);
            break;
          case "Section Break":
            this.make_section(df);
            break;
          case "Column Break":
            this.make_column(df);
            break;
          case "Tab Break":
            this.make_tab(df);
            break;
          default:
            this.make_field(df);
        }
      });
    };
    frappe.ui.form.Layout.prototype.make_page_break = function(df) {
      this.page = $('<div class="form-page page-break"></div>').appendTo(this.wrapper);
      $("#form-tabs").append(`
            <li class="nav-item show">
                <a class="nav-link select-tab" id="${df.fieldname}-tab" data-toggle="tab" data-fieldname="${df.fieldname}" href="#${df.fieldname}" role="tab" aria-controls="${df.label}" aria-selected="true">
                    ${df.label}
                </a>
            </li>`);
      $(".select-tab").click(function() {
        let fieldname = $(this).data("fieldname");
        $(`div.page-break`).hide();
        $(".form-layout .form-page:first").hide();
        $(`div[data-fieldname="${fieldname}"]`).parent().show();
      });
      $('[data-fieldname="details"]').click(function() {
        $(`div.page-break`).hide();
        $(".form-layout .form-page:first").show();
      });
    };
  });
})();
//# sourceMappingURL=edp_online.bundle.YTJQJHMF.js.map
