(() => {
  // ../edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/page/part_stock_availabil/part_stock_availability_control.js
  frappe.provide("edp_online_vehicles.edp_online_vehicles");
  edp_online_vehicles.edp_online_vehicles.PartStockAvailability = class PartStockAvailability {
    constructor(opts) {
      $.extend(this, opts);
      this.make();
    }
    make() {
      var me = this;
      this.start = 0;
      this.content = $(
        frappe.render_template("part_stock_availability")
      ).appendTo(this.parent);
      this.result = this.content.find(".result");
      this.content.on("click", ".btn-order", function() {
        handle_order($(this), "Order");
      });
      function handle_order(element, action) {
        let part = unescape(element.attr("data-part_no"));
        let description = unescape(element.attr("data-part"));
        let selected_items = { part, description };
        if (action === "Order") {
          frappe.route_options = {
            parts: selected_items
          };
          frappe.set_route("app/part-order-1");
        }
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
          part: this.part || ""
        },
        callback: function(r) {
          me.render(r.message);
        }
      });
    }
    render(data) {
      var me = this;
      if (this.start === 0) {
        this.max_count = 0;
        this.result.empty();
      }
      let context = {};
      context = this.get_stock_availability_dashboard_data(
        data,
        this.max_count,
        true
      );
      frappe.call({
        method: "edp_online_vehicles.edp_online_vehicles.page.part_stock_availabil.get_headers.get_context",
        args: { context },
        callback: function(r) {
          if (r.message) {
            context.headers = r.message.headers || [];
            context.hide_unconfirmed_shipments = 0;
            console.log(context);
            if (context.data.length > 0) {
              me.content.find(".result").css("text-align", "unset");
              $(
                frappe.render_template(me.template, context)
              ).appendTo(me.result);
            } else {
              var message = __("No Stock Available Currently");
              me.content.find(".result").css("text-align", "center");
              $(`<div class='text-muted' style='margin: 20px 5px;'>
							${message} </div>`).appendTo(me.result);
            }
          }
        }
      });
    }
    get_stock_availability_dashboard_data(data, max_count, show_item) {
      if (!max_count)
        max_count = 0;
      if (!data)
        data = [];
      let totals = {
        hq_company_total: 0,
        dealers_total: 0,
        pipeline_total: 0,
        unconfirmed_shipments_total: 0,
        models_total: 0,
        date_1_total: 0,
        date_2_total: 0,
        date_3_total: 0,
        date_4_total: 0,
        date_5_total: 0,
        date_6_total: 0,
        date_7_total: 0,
        date_8_total: 0,
        date_9_total: 0,
        date_10_total: 0,
        date_11_total: 0,
        date_12_total: 0
      };
      data.forEach(function(part) {
        part.total = part.hq_company + part.dealers + part.pipeline + part.unconfirmed_shipments;
        totals.hq_company_total += part.hq_company;
        totals.dealers_total += part.dealers;
        totals.pipeline_total += part.pipeline;
        totals.unconfirmed_shipments_total += part.unconfirmed_shipments;
        totals.models_total += part.total;
        max_count = Math.max(max_count, part.total);
        for (let i = 1; i <= 12; i++) {
          totals["date_" + i + "_total"] += part["date_" + i];
        }
      });
      return {
        data,
        totals,
        max_count,
        can_write: 1,
        show_item: show_item || false
      };
    }
  };

<<<<<<<< HEAD:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YIXUNPZ5.js
  // frappe-html:/home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/page/part_stock_availabil/part_stock_availability_list.html
========
  // frappe-html:/home/mc/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/page/part_stock_availabil/part_stock_availability_list.html
>>>>>>>> 615af8410fed88256e28ad03afd118301d4e2e45:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YGH7PC4A.js
  frappe.templates["part_stock_availability_list"] = `<style>
    th.rotate {
        height: 120px;
        white-space: nowrap;
    }

    th.rotate > div {
        transform:
            translate(30px, 0px)
            rotate(315deg);
        width: 30px;
    }

    th.rotate > div > span {
        border-bottom: 1px solid darkgray;
        padding: 5px 10px;
    }

    tbody td {
        border-left: 1px solid darkgray;
        border-right: 1px solid darkgray;
    }

    .button-wrapper {
        position: relative;
    }

    .btn-order {
        position: absolute;
        right: -5.5em;
        background-color: #056fa6;
        color: white;
    }

    tr.category {
        background-color: rgba(211, 211, 211, 0.829);
    }
</style>

<div>
    <table class="table">
        <thead>
            <tr>
                {% for header in headers %}
                    {% if header == "Range" %}
                        <th><div><span>{{ __(header) }}</span></div></th>
                    {% else %}
                        {% if header == "Part No" %}
                            <th><div><span>{{ __(header) }}</span></div></th>
                        {% else %}
                            {% if header == "Description" %}
                                <th><div><span>{{ __(header) }}</span></div></th>
                            {% else %}
                                {% if header == "Dealers" %}
                                    <th class="hide-column rotate"><div><span>{{ __(header) }}</span></div></th>
                                {% else %}
                                    <th class="rotate"><div><span>{{ __(header) }}</span></div></th>
                                {% endif %}
                            {% endif %}
                        {% endif %}
                    {% endif %}
                {% endfor %}
                <th class="rotate"><div><span>Total</span></div></th>
                <th class="hide-ship-column rotate"><div><span>Unconfirmed</span></div></th>
            </tr>
        </thead>
        <tbody>
            <tr class="category">
                <td>

                </td>
                <td>

                </td>

                {% if totals.hq_company_total == 0 %}
                    <td>
                        <a data-type="hq_company_total" data-name="{{ totals.hq_company_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="hq_company_total" data-name="{{ totals.hq_company_total }}">{{ totals.hq_company_total }}</a>
                    </td>
                {% endif %}

                {% if totals.dealers_total == 0 %}
                    <td class="hide-column">
                        <a data-type="dealers_total" data-name="{{ totals.dealers_total }}"></a>
                    </td>
                {% else %}
                    <td class="hide-column">
                        <a data-type="dealers_total" data-name="{{ totals.dealers_total }}">{{ totals.dealers_total }}</a>
                    </td>
                {% endif %}

                {% if totals.pipeline_total == 0 %}
                    <td>
                        <a data-type="pipeline_total" data-name="{{ totals.pipeline_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="pipeline_total" data-name="{{ totals.pipeline_total }}">{{ totals.pipeline_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_1_total == 0 %}
                    <td>
                        <a data-type="date_1_total" data-name="{{ totals.date_1_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_1_total" data-name="{{ totals.date_1_total }}">{{ totals.date_1_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_2_total == 0 %}
                    <td>
                        <a data-type="date_2_total" data-name="{{ totals.date_2_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_2_total" data-name="{{ totals.date_2_total }}">{{ totals.date_2_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_3_total == 0 %}
                    <td>
                        <a data-type="date_3_total" data-name="{{ totals.date_3_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_3_total" data-name="{{ totals.date_3_total }}">{{ totals.date_3_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_4_total == 0 %}
                    <td>
                        <a data-type="date_4_total" data-name="{{ totals.date_4_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_4_total" data-name="{{ totals.date_4_total }}">{{ totals.date_4_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_5_total == 0 %}
                    <td>
                        <a data-type="date_5_total" data-name="{{ totals.date_5_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_5_total" data-name="{{ totals.date_5_total }}">{{ totals.date_5_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_6_total == 0 %}
                    <td>
                        <a data-type="date_6_total" data-name="{{ totals.date_6_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_6_total" data-name="{{ totals.date_6_total }}">{{ totals.date_6_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_7_total == 0 %}
                    <td>
                        <a data-type="date_7_total" data-name="{{ totals.date_7_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_7_total" data-name="{{ totals.date_7_total }}">{{ totals.date_7_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_8_total == 0 %}
                    <td>
                        <a data-type="date_8_total" data-name="{{ totals.date_8_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_8_total" data-name="{{ totals.date_8_total }}">{{ totals.date_8_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_9_total == 0 %}
                    <td>
                        <a data-type="date_9_total" data-name="{{ totals.date_9_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_9_total" data-name="{{ totals.date_9_total }}">{{ totals.date_9_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_10_total == 0 %}
                    <td>
                        <a data-type="date_10_total" data-name="{{ totals.date_10_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_10_total" data-name="{{ totals.date_10_total }}">{{ totals.date_10_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_11_total == 0 %}
                    <td>
                        <a data-type="date_11_total" data-name="{{ totals.date_11_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_11_total" data-name="{{ totals.date_11_total }}">{{ totals.date_11_total }}</a>
                    </td>
                {% endif %}

                {% if totals.date_12_total == 0 %}
                    <td>
                        <a data-type="date_12_total" data-name="{{ totals.date_12_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="date_12_total" data-name="{{ totals.date_12_total }}">{{ totals.date_12_total }}</a>
                    </td>
                {% endif %}

                {% if totals.models_total == 0 %}
                    <td>
                        <a data-type="models_total" data-name="{{ totals.models_total }}"></a>
                    </td>
                {% else %}
                    <td>
                        <a data-type="models_total" data-name="{{ totals.models_total }}">{{ totals.models_total }}</a>
                    </td>
                {% endif %}

                {% if totals.unconfirmed_shipments_total == 0 %}
                    <td class="hide-ship-column">
                        <a data-type="unconfirmed_shipments_total" data-name="{{ totals.unconfirmed_shipments_total }}"></a>
                    </td>
                {% else %}
                    <td class="hide-ship-column">
                        <a data-type="unconfirmed_shipments_total" data-name="{{ totals.unconfirmed_shipments_total }}">{{ totals.unconfirmed_shipments_total }}</a>
                    </td>
                {% endif %}
            </tr>

            {% for d in data %}
                    <tr>
                        <td>
                            <a data-type="part_no" data-name="{{ d.part_no }}">
                                {{ d.part_no }}
                            </a>
                        </td>
                        <td>
                            <a data-type="part" data-name="{{ d.part }}">{{ d.part }}</a>
                        </td>

                        {% if d.hq_company == 0 %}
                            <td>
                                <a data-name="{{ d.hq_company }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.hq_company }}">{{ d.hq_company }}</a>
                            </td>
                        {% endif %}


                        {% if d.dealers == 0 %}
                            <td class="hide-column">
                                <a data-name="{{ d.dealers }}"></a>
                            </td>
                        {% else %}
                            <td class="hide-column">
                                <a data-name="{{ d.dealers }}">{{ d.dealers }}</a>
                            </td>
                        {% endif %}


                        {% if d.pipeline == 0 %}
                            <td>
                                <a data-name="{{ d.pipeline }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.pipeline }}">{{ d.pipeline }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_1 == 0 %}
                            <td>
                                <a data-name="{{ d.date_1 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_1 }}">{{ d.date_1 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_2 == 0 %}
                            <td>
                                <a data-name="{{ d.date_2 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_2 }}">{{ d.date_2 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_3 == 0 %}
                            <td>
                                <a data-name="{{ d.date_3 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_3 }}">{{ d.date_3 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_4 == 0 %}
                            <td>
                                <a data-name="{{ d.date_4 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_4 }}">{{ d.date_4 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_5 == 0 %}
                            <td>
                                <a data-name="{{ d.date_5 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_5 }}">{{ d.date_5 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_6 == 0 %}
                            <td>
                                <a data-name="{{ d.date_6 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_6 }}">{{ d.date_6 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_7 == 0 %}
                            <td>
                                <a data-name="{{ d.date_7 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_7 }}">{{ d.date_7 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_8 == 0 %}
                            <td>
                                <a data-name="{{ d.date_8 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_8 }}">{{ d.date_8 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_9 == 0 %}
                            <td>
                                <a data-name="{{ d.date_9 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_9 }}">{{ d.date_9 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_10 == 0 %}
                            <td>
                                <a data-name="{{ d.date_10 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_10 }}">{{ d.date_10 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_11 == 0 %}
                            <td>
                                <a data-name="{{ d.date_11 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_11 }}">{{ d.date_11 }}</a>
                            </td>
                        {% endif %}


                        {% if d.date_12 == 0 %}
                            <td>
                                <a data-name="{{ d.date_12 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a data-name="{{ d.date_12 }}">{{ d.date_12 }}</a>
                            </td>
                        {% endif %}


                        {% if hide_unconfirmed_shipments == 1 %}

                            {% if d.models_total == 0 %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-part_no="{{ d.part_no }}"
                                            data-actual_qty="{{ d.actual_qty }}"
                                            data-part="{{ d.part }}">{{ __("Order") }}</button>
                                    </div>
                                    <a data-name="{{ d.total }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-part_no="{{ d.part_no }}"
                                            data-actual_qty="{{ d.actual_qty }}"
                                            data-part="{{ d.part }}">{{ __("Order") }}</button>
                                    </div>
                                    <a data-name="{{ d.total }}">{{ d.total }}</a>
                                </td>
                            {% endif %}

                            {% if d.unconfirmed_shipments == 0 %}
                                <td class="hide-ship-column">
                                    <a data-name="{{ d.unconfirmed_shipments }}"></a>
                                </td>
                            {% else %}
                                <td class="hide-ship-column">
                                    <a data-name="{{ d.unconfirmed_shipments }}">{{ d.unconfirmed_shipments }}</a>
                                </td>
                            {% endif %}

                        {% else %}

                            {% if d.total == 0 %}
                                <td>
                                    <a data-name="{{ d.total }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <a data-name="{{ d.total }}">{{ d.total }}</a>
                                </td>
                            {% endif %}

                            {% if d.unconfirmed_shipments == 0 %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-part_no="{{ d.part_no }}"
                                            data-actual_qty="{{ d.actual_qty }}"
                                            data-part="{{ d.part }}">{{ __("Order") }}</button>
                                    </div>
                                    <a data-name="{{ d.unconfirmed_shipments }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-part_no="{{ d.part_no }}"
                                            data-actual_qty="{{ d.actual_qty }}"
                                            data-part="{{ d.part }}">{{ __("Order") }}</button>
                                    </div>
                                    <a data-name="{{ d.unconfirmed_shipments }}">{{ d.unconfirmed_shipments }}</a>
                                </td>
                            {% endif %}

                        {% endif %}
                    </tr>
            {% endfor %}
        </tbody>
    </table>
</div>
`;

<<<<<<<< HEAD:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YIXUNPZ5.js
  // frappe-html:/home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/page/part_stock_availabil/part_stock_availability.html
========
  // frappe-html:/home/mc/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/page/part_stock_availabil/part_stock_availability.html
>>>>>>>> 615af8410fed88256e28ad03afd118301d4e2e45:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YGH7PC4A.js
  frappe.templates["part_stock_availability"] = `<div class="stock-levels">
	<div class="result">
	</div>
	<div class="more hidden" style="padding: 15px;">
		<a class="btn btn-default btn-xs btn-more">More</a>
	</div>
</div>
`;
})();
<<<<<<<< HEAD:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YIXUNPZ5.js
//# sourceMappingURL=part_stock_availability.bundle.YIXUNPZ5.js.map
========
//# sourceMappingURL=part_stock_availability.bundle.YGH7PC4A.js.map
>>>>>>>> 615af8410fed88256e28ad03afd118301d4e2e45:edp_online_vehicles/public/dist/js/part_stock_availability.bundle.YGH7PC4A.js
