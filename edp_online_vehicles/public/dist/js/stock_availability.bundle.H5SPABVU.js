(() => {
  // frappe-html:/home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/dashboard/stock_availability.html
  frappe.templates["stock_availability"] = `<div class="stock-levels">
	<div class="result">
	</div>
	<div class="more hidden" style="padding: 15px;">
		<a class="btn btn-default btn-xs btn-more">More</a>
	</div>
</div>
`;

  // frappe-html:/home/frappe/frappe-bench/apps/edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/dashboard/stock_availability_list.html
  frappe.templates["stock_availability_list"] = `<style>
    th.rotate {
        height: 120px;
        white-space: nowrap;
    }

    th.rotate > div {
        transform:
            /* Magic Numbers */
            translate(25px, 0px)
            /* 45 is really 360 - 45 */
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

{% if hide_dealer_stock == 1 %}
  <style>
    .hide-column {
      display: none;
    }
  </style>
{% endif %}

{% if hide_unconfirmed_shipments == 1 %}
  <style>
    .hide-ship-column {
      display: none;
    }
  </style>
{% endif %}

<div>
    <table class="table">
        <thead>
            <tr>
                {% for header in headers %}
                    {% if header == "Range" %}
                        <th><div><span>{{ __(header) }}</span></div></th>
                    {% else %}
                        {% if header == "Model Code" %}
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
            {% for d in data %}
                <tr class="category">
                    <td>
                        <a data-type="model_range" data-name="{{ d.model_range }}">{{ d.model_range }}</a>
                    </td>
                    <td>

                    </td>
                    <td>

                    </td>

                    {% if d.hq_company_total == 0 %}
                        <td>
                            <a data-type="hq_company_total" data-name="{{ d.hq_company_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="hq_company_total" data-name="{{ d.hq_company_total }}">{{ d.hq_company_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.dealers_total == 0 %}
                        <td class="hide-column">
                            <a data-type="dealers_total" data-name="{{ d.dealers_total }}"></a>
                        </td>
                    {% else %}
                        <td class="hide-column">
                            <a data-type="dealers_total" data-name="{{ d.dealers_total }}">{{ d.dealers_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.pipeline_total == 0 %}
                        <td>
                            <a data-type="pipeline_total" data-name="{{ d.pipeline_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="pipeline_total" data-name="{{ d.pipeline_total }}">{{ d.pipeline_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_1_total == 0 %}
                        <td>
                            <a data-type="date_1_total" data-name="{{ d.date_1_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_1_total" data-name="{{ d.date_1_total }}">{{ d.date_1_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_2_total == 0 %}
                        <td>
                            <a data-type="date_2_total" data-name="{{ d.date_2_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_2_total" data-name="{{ d.date_2_total }}">{{ d.date_2_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_3_total == 0 %}
                        <td>
                            <a data-type="date_3_total" data-name="{{ d.date_3_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_3_total" data-name="{{ d.date_3_total }}">{{ d.date_3_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_4_total == 0 %}
                        <td>
                            <a data-type="date_4_total" data-name="{{ d.date_4_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_4_total" data-name="{{ d.date_4_total }}">{{ d.date_4_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_5_total == 0 %}
                        <td>
                            <a data-type="date_5_total" data-name="{{ d.date_5_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_5_total" data-name="{{ d.date_5_total }}">{{ d.date_5_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_6_total == 0 %}
                        <td>
                            <a data-type="date_6_total" data-name="{{ d.date_6_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_6_total" data-name="{{ d.date_6_total }}">{{ d.date_6_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_7_total == 0 %}
                        <td>
                            <a data-type="date_7_total" data-name="{{ d.date_7_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_7_total" data-name="{{ d.date_7_total }}">{{ d.date_7_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_8_total == 0 %}
                        <td>
                            <a data-type="date_8_total" data-name="{{ d.date_8_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_8_total" data-name="{{ d.date_8_total }}">{{ d.date_8_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_9_total == 0 %}
                        <td>
                            <a data-type="date_9_total" data-name="{{ d.date_9_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_9_total" data-name="{{ d.date_9_total }}">{{ d.date_9_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_10_total == 0 %}
                        <td>
                            <a data-type="date_10_total" data-name="{{ d.date_10_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_10_total" data-name="{{ d.date_10_total }}">{{ d.date_10_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_11_total == 0 %}
                        <td>
                            <a data-type="date_11_total" data-name="{{ d.date_11_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_11_total" data-name="{{ d.date_11_total }}">{{ d.date_11_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.date_12_total == 0 %}
                        <td>
                            <a data-type="date_12_total" data-name="{{ d.date_12_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="date_12_total" data-name="{{ d.date_12_total }}">{{ d.date_12_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.models_total == 0 %}
                        <td>
                            <a data-type="models_total" data-name="{{ d.models_total }}"></a>
                        </td>
                    {% else %}
                        <td>
                            <a data-type="models_total" data-name="{{ d.models_total }}">{{ d.models_total }}</a>
                        </td>
                    {% endif %}

                    {% if d.unconfirmed_shipments_total == 0 %}
                        <td class="hide-ship-column">
                            <a data-type="unconfirmed_shipments_total" data-name="{{ d.unconfirmed_shipments_total }}"></a>
                        </td>
                    {% else %}
                        <td class="hide-ship-column">
                            <a data-type="unconfirmed_shipments_total" data-name="{{ d.unconfirmed_shipments_total }}">{{ d.unconfirmed_shipments_total }}</a>
                        </td>
                    {% endif %}
                </tr>

                {% for model in d.models %}

                    <tr>
                        <td>

                        </td>
                        <td>
                            <a data-type="model_code" data-name="{{ model.model_code }}">
                                {{ model.model_code }}
                            </a>
                        </td>
                        <td>
                            <a data-type="model" data-name="{{ model.model }}">{{ model.model }}</a>
                        </td>

                        {% if model.hq_company == 0 %}
                            <td>
                                <a class="hq_click" data-model_code="{{ model.model_code }}" data-name="{{ model.hq_company }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="hq_click" data-model_code="{{ model.model_code }}" data-name="{{ model.hq_company }}">{{ model.hq_company }}</a>
                            </td>
                        {% endif %}


                        {% if model.dealers == 0 %}
                            <td class="hide-column">
                                <a class="dealer_click" data-model_code="{{ model.model_code }}" data-name="{{ model.dealers }}"></a>
                            </td>
                        {% else %}
                            <td class="hide-column">
                                <a class="dealer_click" data-model_code="{{ model.model_code }}" data-name="{{ model.dealers }}">{{ model.dealers }}</a>
                            </td>
                        {% endif %}


                        {% if model.pipeline == 0 %}
                            <td>
                                <a class="pipeline_click" data-model_code="{{ model.model_code }}" data-name="{{ model.pipeline }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="pipeline_click" data-model_code="{{ model.model_code }}" data-name="{{ model.pipeline }}">{{ model.pipeline }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_1 == 0 %}
                            <td>
                                <a class="date_1_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_1 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_1_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_1 }}">{{ model.date_1 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_2 == 0 %}
                            <td>
                                <a class="date_2_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_2 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_2_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_2 }}">{{ model.date_2 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_3 == 0 %}
                            <td>
                                <a class="date_3_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_3 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_3_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_3 }}">{{ model.date_3 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_4 == 0 %}
                            <td>
                                <a class="date_4_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_4 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_4_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_4 }}">{{ model.date_4 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_5 == 0 %}
                            <td>
                                <a class="date_5_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_5 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_5_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_5 }}">{{ model.date_5 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_6 == 0 %}
                            <td>
                                <a class="date_6_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_6 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_6_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_6 }}">{{ model.date_6 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_7 == 0 %}
                            <td>
                                <a class="date_7_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_7 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_7_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_7 }}">{{ model.date_7 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_8 == 0 %}
                            <td>
                                <a class="date_8_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_8 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_8_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_8 }}">{{ model.date_8 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_9 == 0 %}
                            <td>
                                <a class="date_9_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_9 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_9_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_9 }}">{{ model.date_9 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_10 == 0 %}
                            <td>
                                <a class="date_10_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_10 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_10_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_10 }}">{{ model.date_10 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_11 == 0 %}
                            <td>
                                <a class="date_11_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_11 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_11_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_11 }}">{{ model.date_11 }}</a>
                            </td>
                        {% endif %}


                        {% if model.date_12 == 0 %}
                            <td>
                                <a class="date_12_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_12 }}"></a>
                            </td>
                        {% else %}
                            <td>
                                <a class="date_12_click" data-model_code="{{ model.model_code }}" data-name="{{ model.date_12 }}">{{ model.date_12 }}</a>
                            </td>
                        {% endif %}


                        {% if hide_unconfirmed_shipments == 1 %}

                            {% if model.models_total == 0 %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-model_code="{{ model.model_code }}"
                                            data-actual_qty="{{ model.actual_qty }}"
                                            data-model="{{ model.model }}">{{ __("Order") }}</button>
                                    </div>
                                    <a class="total_click" data-model_code="{{ model.model_code }}" data-name="{{ model.total }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-model_code="{{ model.model_code }}"
                                            data-actual_qty="{{ model.actual_qty }}"
                                            data-model="{{ model.model }}">{{ __("Order") }}</button>
                                    </div>
                                    <a class="total_click" data-model_code="{{ model.model_code }}" data-name="{{ model.total }}">{{ model.total }}</a>
                                </td>
                            {% endif %}

                            {% if model.unconfirmed_shipments == 0 %}
                                <td class="hide-ship-column">
                                    <a data-name="{{ model.unconfirmed_shipments }}"></a>
                                </td>
                            {% else %}
                                <td class="hide-ship-column">
                                    <a data-name="{{ model.unconfirmed_shipments }}">{{ model.unconfirmed_shipments }}</a>
                                </td>
                            {% endif %}

                        {% else %}

                            {% if model.total == 0 %}
                                <td>
                                    <a class="total_click" data-model_code="{{ model.model_code }}" data-name="{{ model.total }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <a class="total_click" data-model_code="{{ model.model_code }}" data-name="{{ model.total }}">{{ model.total }}</a>
                                </td>
                            {% endif %}

                            {% if model.unconfirmed_shipments == 0 %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-model_code="{{ model.model_code }}"
                                            data-actual_qty="{{ model.actual_qty }}"
                                            data-model="{{ model.model }}">{{ __("Order") }}</button>
                                    </div>
                                    <a class="unconfirmed_click" data-model_code="{{ model.model_code }}" data-name="{{ model.unconfirmed_shipments }}"></a>
                                </td>
                            {% else %}
                                <td>
                                    <div class="button-wrapper">
                                        <button class="btn btn-xs btn-order"
                                            data-disable_quick_entry="{{ d.disable_quick_entry }}"
                                            data-model_code="{{ model.model_code }}"
                                            data-actual_qty="{{ model.actual_qty }}"
                                            data-model="{{ model.model }}">{{ __("Order") }}</button>
                                    </div>
                                    <a class="unconfirmed_click" data-model_code="{{ model.model_code }}" data-model_code="{{ model.model_code }}" data-name="{{ model.unconfirmed_shipments }}">{{ model.unconfirmed_shipments }}</a>
                                </td>
                            {% endif %}

                        {% endif %}
                    </tr>
                {% endfor %}
            {% endfor %}
        </tbody>
    </table>
</div>
`;

  // ../edp_online_vehicles/edp_online_vehicles/edp_online_vehicles/dashboard/stock_availability.js
  frappe.provide("edp_online_vehicles.edp_online_vehicles_mahindrasa");
  edp_online_vehicles.edp_online_vehicles_mahindrasa.StockAvailability = class StockAvailability {
    constructor(opts) {
      $.extend(this, opts);
      this.make();
    }
    make() {
      var me = this;
      this.start = 0;
      this.content = $(frappe.render_template("stock_availability")).appendTo(
        this.parent
      );
      this.result = this.content.find(".result");
      this.content.on("click", ".btn-order", function() {
        handle_order($(this), "Order");
      });
      this.content.on("click", ".hq_click", function() {
        handle_stock_popup($(this), "HQ");
      });
      this.content.on("click", ".dealer_click", function() {
        handle_stock_popup($(this), "Dealer");
      });
      this.content.on("click", ".pipeline_click", function() {
        handle_stock_popup($(this), "Pipeline");
      });
      this.content.on("click", ".date_1_click", function() {
        handle_stock_popup($(this), "Date 1");
      });
      this.content.on("click", ".date_2_click", function() {
        handle_stock_popup($(this), "Date 2");
      });
      this.content.on("click", ".date_3_click", function() {
        handle_stock_popup($(this), "Date 3");
      });
      this.content.on("click", ".date_4_click", function() {
        handle_stock_popup($(this), "Date 4");
      });
      this.content.on("click", ".date_5_click", function() {
        handle_stock_popup($(this), "Date 5");
      });
      this.content.on("click", ".date_6_click", function() {
        handle_stock_popup($(this), "Date 6");
      });
      this.content.on("click", ".date_7_click", function() {
        handle_stock_popup($(this), "Date 7");
      });
      this.content.on("click", ".date_8_click", function() {
        handle_stock_popup($(this), "Date 8");
      });
      this.content.on("click", ".date_9_click", function() {
        handle_stock_popup($(this), "Date 9");
      });
      this.content.on("click", ".date_10_click", function() {
        handle_stock_popup($(this), "Date 10");
      });
      this.content.on("click", ".date_11_click", function() {
        handle_stock_popup($(this), "Date 11");
      });
      this.content.on("click", ".date_12_click", function() {
        handle_stock_popup($(this), "Date 12");
      });
      this.content.on("click", ".total_click", function() {
        handle_stock_popup($(this), "Total");
      });
      this.content.on("click", ".unconfirmed_click", function() {
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
        localStorage.setItem(
          "vehicle_order_model_data",
          JSON.stringify({
            model_code,
            model_description
          })
        );
        frappe.new_doc("Vehicle Order");
      }
      function handle_stock_popup(element, action) {
        let model_code = unescape(element.attr("data-model_code"));
        if (action === "HQ") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_hq_data",
            args: {
              model: model_code
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_popup(r.message);
              }
            }
          });
        }
        if (action === "Dealer") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_dealer_data",
            args: {
              model: model_code
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_popup(r.message);
              }
            }
          });
        }
        if (action === "Pipeline") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 1") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 2") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 3") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 4") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 5") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 6") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 7") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 8") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 9") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 10") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 11") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Date 12") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_pipline_data",
            args: {
              model: model_code,
              date: action
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
          });
        }
        if (action === "Total") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_total_data",
            args: {
              model: model_code
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_popup(r.message);
              }
            }
          });
        }
        if (action === "Unconfirmed") {
          frappe.call({
            method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_popup_data.get_unconfirmed_data",
            args: {
              model: model_code
            },
            callback: function(r) {
              if (r.message) {
                open_vehicle_shipment_popup(r.message);
              }
            }
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
          $popup.find(".popup-close").on("click", function() {
            $popup.remove();
          });
          $popup.find(".allocate-order").on("click", function() {
            allocateOrderAction($popup);
          });
          $popup.find(".reserve").on("click", function() {
            reserveAction($popup);
          });
          $popup.find(".view-model-btn").on("click", function(e) {
            let modelCode = $popup.find(".popup-content table tbody tr:first td:eq(2)").text().trim();
            if (!modelCode) {
              alert("Unable to retrieve model details.");
              return;
            }
            open_model_popup(modelCode);
          });
          $popup.find(".action-btn").on("click", function(e) {
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
            $menu.css({
              top: btnPos.top + btnHeight,
              left: desiredLeft
            }).show();
            let menuRect = $menu[0].getBoundingClientRect();
            let viewportWidth = $(window).width();
            if (menuRect.right > viewportWidth) {
              let shift = menuRect.right - viewportWidth + 5;
              $menu.css({ left: desiredLeft - shift });
            }
          });
          $(document).on("click", function() {
            $popup.find(".dropdown-menu").hide();
          });
          let user_company = frappe.defaults.get_user_default("Company");
          frappe.db.get_value(
            "Company",
            { custom_head_office: 1 },
            "name",
            function(r) {
              if (r && r.name && r.name !== user_company) {
                $popup.find(".action-btn").hide();
              }
            }
          );
        }
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
        vehicle_data.forEach(function(row) {
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
        $popup.find("#select-all").on("change", function() {
          let checked = $(this).prop("checked");
          $popup.find(".vehicle-checkbox:not(:disabled)").prop("checked", checked);
          updateActionDropdownState();
        });
        $popup.find(".vehicle-checkbox").on("change", function() {
          updateActionDropdownState();
        });
        function updateActionDropdownState() {
          let checkedCount = $popup.find(
            ".vehicle-checkbox:checked"
          ).length;
          let $allocate = $popup.find(".dropdown-menu .allocate-order");
          if (checkedCount > 1) {
            $allocate.addClass("disabled");
          } else {
            $allocate.removeClass("disabled");
          }
        }
        $popup.find(".vin-search").on("keyup", function() {
          let searchValue = $(this).val().toLowerCase();
          let $tableBody = $popup.find(".popup-content table tbody");
          let visibleCount = 0;
          $tableBody.find("tr").each(function() {
            let $row = $(this);
            if ($row.hasClass("no-match"))
              return;
            let vinText = $row.find(".vinserial_no").text().toLowerCase();
            if (vinText.indexOf(searchValue) !== -1) {
              $row.show();
              visibleCount++;
            } else {
              $row.hide();
            }
          });
          $tableBody.find("tr.no-match").remove();
          $popup.find(".popup-count").text(`${visibleCount} ${__("Vehicles")}`);
          if (visibleCount === 0) {
            let colCount = $popup.find(
              ".popup-content table thead th"
            ).length;
            $tableBody.append(
              `<tr class="no-match"><td colspan="${colCount}" style="text-align: center;">${__(
                "No matching VIN/Serial No found"
              )}</td></tr>`
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
          $popup.find(".popup-close").on("click", function() {
            $popup.remove();
          });
          $popup.find(".allocate-order").on("click", function() {
            allocateOrderAction($popup);
          });
          $popup.find(".reserve").on("click", function() {
            reserveAction($popup);
          });
          $popup.find(".view-model-btn").on("click", function(e) {
            let modelCode = $popup.find(".popup-content table tbody tr:first td:eq(2)").text().trim();
            if (!modelCode) {
              alert("Unable to retrieve model details.");
              return;
            }
            open_model_popup(modelCode);
          });
          $popup.find(".action-btn").on("click", function(e) {
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
            $menu.css({
              top: btnPos.top + btnHeight,
              left: desiredLeft
            }).show();
            let menuRect = $menu[0].getBoundingClientRect();
            let viewportWidth = $(window).width();
            if (menuRect.right > viewportWidth) {
              let shift = menuRect.right - viewportWidth + 5;
              $menu.css({ left: desiredLeft - shift });
            }
          });
          $(document).on("click", function() {
            $popup.find(".dropdown-menu").hide();
          });
          let user_company = frappe.defaults.get_user_default("Company");
          frappe.db.get_value(
            "Company",
            { custom_head_office: 1 },
            "name",
            function(r) {
              if (r && r.name && r.name !== user_company) {
                $popup.find(".action-btn").hide();
              }
            }
          );
        }
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
        vehicle_data.forEach(function(row) {
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
        $popup.find("#select-all").on("change", function() {
          let checked = $(this).prop("checked");
          $popup.find(".vehicle-checkbox:not(:disabled)").prop("checked", checked);
          updateActionDropdownState();
        });
        $popup.find(".vehicle-checkbox").on("change", function() {
          updateActionDropdownState();
        });
        function updateActionDropdownState() {
          let checkedCount = $popup.find(
            ".vehicle-checkbox:checked"
          ).length;
          let $allocate = $popup.find(".dropdown-menu .allocate-order");
          if (checkedCount > 1) {
            $allocate.addClass("disabled");
          } else {
            $allocate.removeClass("disabled");
          }
        }
        $popup.find(".vin-search").on("keyup", function() {
          let searchValue = $(this).val().toLowerCase();
          let $tableBody = $popup.find(".popup-content table tbody");
          let visibleCount = 0;
          $tableBody.find("tr").each(function() {
            let $row = $(this);
            if ($row.hasClass("no-match"))
              return;
            let vinText = $row.find(".vinserial_no").text().toLowerCase();
            if (vinText.indexOf(searchValue) !== -1) {
              $row.show();
              visibleCount++;
            } else {
              $row.hide();
            }
          });
          $tableBody.find("tr.no-match").remove();
          $popup.find(".popup-count").text(`${visibleCount} ${__("Vehicles")}`);
          if (visibleCount === 0) {
            let colCount = $popup.find(
              ".popup-content table thead th"
            ).length;
            $tableBody.append(
              `<tr class="no-match"><td colspan="${colCount}" style="text-align: center;">${__(
                "No matching VIN/Serial No found"
              )}</td></tr>`
            );
          }
        });
        $popup.show();
      }
      function open_model_popup(modelCode) {
        frappe.call({
          method: "edp_online_vehicles.events.get_model_data.get_model_data",
          args: { modelname: modelCode },
          callback: function(response) {
            if (response.message) {
              let updateGallery2 = function() {
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
                  imgObj.label + " Image (" + (currentIndex + 1) + " of " + images.length + ")"
                );
                $dotsContainer.find(".dot").removeClass("active").eq(currentIndex).addClass("active");
                $galleryImage.off("load").on("load", function() {
                  let naturalWidth = this.naturalWidth;
                  let naturalHeight = this.naturalHeight;
                  let maxWidth = $(window).width() * 0.9;
                  let maxModalHeight = $(window).height() * 0.9;
                  let extraSpace = 150;
                  let availableImageHeight = maxModalHeight - extraSpace;
                  let newWidth = Math.min(naturalWidth, maxWidth);
                  let newHeight = Math.min(
                    naturalHeight,
                    availableImageHeight
                  );
                  $("#model-popup").css({
                    width: newWidth + "px"
                  });
                  $galleryImage.css({
                    width: newWidth + "px",
                    height: newHeight + "px"
                  });
                });
              };
              var updateGallery = updateGallery2;
              let modelData = response.message;
              let images = [];
              if (modelData.front_image)
                images.push({
                  label: "Front",
                  url: modelData.front_image
                });
              if (modelData.rear_image)
                images.push({
                  label: "Rear",
                  url: modelData.rear_image
                });
              if (modelData.left_image)
                images.push({
                  label: "Left",
                  url: modelData.left_image
                });
              if (modelData.right_image)
                images.push({
                  label: "Right",
                  url: modelData.right_image
                });
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
              const $noImageMessage = modalHtml.find(".no-image-message");
              $dotsContainer.empty();
              if (images.length > 0) {
                images.forEach((img, index) => {
                  let $dot = $(`<span class="dot"></span>`);
                  if (index === 0)
                    $dot.addClass("active");
                  $dot.on("click", function() {
                    currentIndex = index;
                    updateGallery2();
                  });
                  $dotsContainer.append($dot);
                });
              }
              updateGallery2();
              modalHtml.find(".left-arrow").on("click", function(e) {
                e.stopPropagation();
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                updateGallery2();
              });
              modalHtml.find(".right-arrow").on("click", function(e) {
                e.stopPropagation();
                currentIndex = (currentIndex + 1) % images.length;
                updateGallery2();
              });
              modalHtml.find(".model-close").on("click", function() {
                modalHtml.remove();
              });
              modalHtml.on("click", function(e) {
                if (e.target.id === "model-popup-overlay") {
                  modalHtml.remove();
                }
              });
            }
          }
        });
      }
      function allocateOrderAction($popup) {
        let $selectedVehicleRow = $popup.find(".vehicle-checkbox:checked").closest("tr");
        if ($selectedVehicleRow.length !== 1) {
          frappe.msgprint(
            __("Please select exactly one vehicle to allocate.")
          );
          return;
        }
        let vin = $selectedVehicleRow.find(".vinserial_no").text().trim();
        let modelCode = $selectedVehicleRow.find("td").eq(2).text().trim();
        let colour = $selectedVehicleRow.find("td").eq(7).text().trim() || "";
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
                    colour
                  }
                };
              }
            },
            {
              fieldname: "vinserial_no",
              label: __("VIN/Serial No"),
              fieldtype: "Data",
              default: vin,
              read_only: 1
            },
            {
              fieldname: "model_code",
              label: __("Model"),
              fieldtype: "Data",
              default: modelCode,
              read_only: 1
            }
          ],
          primary_action_label: __("Allocate"),
          primary_action: (values) => {
            frappe.call({
              method: "edp_online_vehicles.events.stock_availability.allocate_vinno",
              args: {
                hq_order_doc: values.order_link,
                vinno: values.vinserial_no
              },
              callback: function(r) {
                if (r.message) {
                  frappe.msgprint(r.message);
                }
              }
            });
            d.hide();
          }
        });
        d.show();
        $popup.remove();
      }
      function reserveAction($popup) {
        let $selectedVehicleRows = $popup.find(".vehicle-checkbox:checked").closest("tr");
        if ($selectedVehicleRows.length === 0) {
          frappe.msgprint(__("Please select at least one vehicle"));
          return;
        }
        let vins = [];
        let dealers = [];
        $selectedVehicleRows.each(function() {
          let vin = $(this).find(".vinserial_no").text().trim();
          vins.push(vin);
          let dealer = $(this).find("td").eq(6).text().trim();
          dealers.push(dealer);
        });
        let defaultDealer = dealers.every((d) => d === dealers[0]) ? dealers[0] : "";
        const dialog = new frappe.ui.Dialog({
          title: __("Reserve Stock"),
          fields: [
            {
              label: __("Dealer"),
              fieldname: "dealer",
              fieldtype: "Link",
              options: "Company",
              default: defaultDealer,
              reqd: 1
            },
            {
              label: __("Customer"),
              fieldname: "customer",
              fieldtype: "Link",
              options: "Dealer Customer"
            },
            {
              label: __("Status"),
              fieldname: "status",
              fieldtype: "Select",
              options: ["Reserved"],
              default: "Reserved",
              read_only: 1
            },
            {
              label: __("Reserve Reason"),
              fieldname: "reserve_reason",
              fieldtype: "Small Text",
              reqd: 1
            },
            {
              label: __("Reserve From Date"),
              fieldname: "reserve_from_date",
              fieldtype: "Date",
              default: frappe.datetime.get_today(),
              reqd: 1
            },
            {
              label: __("Reserve To Date"),
              fieldname: "reserve_to_date",
              fieldtype: "Date"
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
                  read_only: 1
                }
              ],
              data: vins.map((v) => ({ vin_serial_no: v }))
            }
          ],
          primary_action_label: __("Reserve"),
          primary_action(values) {
            if (values.reserve_to_date && values.reserve_to_date < values.reserve_from_date) {
              frappe.msgprint(
                __(
                  "Reserve To Date cannot be earlier than Reserve From Date."
                )
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
                reserve_to_date: values.reserve_to_date
              },
              callback: function(r) {
                if (r.message) {
                  frappe.msgprint(
                    "Selected Vehicles have been reserved."
                  );
                }
              }
            });
            dialog.hide();
          }
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
          model: this.model || ""
        },
        callback: function(r) {
          me.render(r.message);
        }
      });
    }
    render(data) {
      const me = this;
      if (this.start === 0) {
        this.max_count = 0;
      }
      const context = this.get_stock_availability_dashboard_data(
        data,
        this.max_count,
        true
      );
      frappe.call({
        method: "edp_online_vehicles.edp_online_vehicles_mahindrasa.dashboard.get_headers.get_context",
        args: { context },
        callback: function(r) {
          if (!r.message)
            return;
          context.headers = r.message.headers || [];
          context.hide_dealer_stock = 0;
          context.hide_unconfirmed_shipments = 0;
          frappe.db.get_single_value(
            "Vehicle Stock Settings",
            "hide_dealer_stock_availability"
          ).then((hide_dealer) => {
            context.hide_dealer_stock = hide_dealer || 0;
            return frappe.db.get_single_value(
              "Vehicle Stock Settings",
              "hide_unconfirmed_shipments"
            );
          }).then((hide_unconfirmed) => {
            context.hide_unconfirmed_shipments = hide_unconfirmed || 0;
            if (context.data.length > 0) {
              me.content.find(".result").css("text-align", "unset");
              me.result.html(
                `<div class="dashboard-template-wrapper">
								${frappe.render_template(me.template, context)}
							 </div>`
              );
            } else {
              const msg = __("No Stock Available Currently");
              me.content.find(".result").css("text-align", "center");
              me.result.html(
                `<div class='text-muted' style='margin:20px 5px;'>${msg}</div>`
              );
            }
          });
        }
      });
    }
    get_stock_availability_dashboard_data(data, max_count, show_item) {
      if (!max_count)
        max_count = 0;
      if (!data)
        data = [];
      data.forEach(function(model_range) {
        var useYes = false;
        if (model_range.models && model_range.models.length > 0 && typeof model_range.models[0].hq_company === "string") {
          useYes = true;
        }
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
        model_range.models.forEach(function(model) {
          if (useYes) {
            var total = model.hq_company === "Yes" || model.dealers === "Yes" || model.pipeline === "Yes" || model.unconfirmed_shipments === "Yes" ? "Yes" : "";
            model.total = total;
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
            model.total = model.hq_company + model.dealers + model.pipeline + model.unconfirmed_shipments;
            model_range.hq_company_total += model.hq_company;
            model_range.dealers_total += model.dealers;
            model_range.pipeline_total += model.pipeline;
            model_range.unconfirmed_shipments_total += model.unconfirmed_shipments;
            model_range.models_total += model.total;
            max_count = Math.max(model.total, max_count);
          }
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
        if (useYes) {
          for (var i = 1; i <= 12; i++) {
            var dateField = "date_" + i + "_total";
            model_range[dateField] = model_range[dateField] > 0 ? "Yes" : "";
          }
        }
      });
      return {
        data,
        max_count,
        can_write: 1,
        show_item: show_item || false
      };
    }
  };
})();
//# sourceMappingURL=stock_availability.bundle.H5SPABVU.js.map
