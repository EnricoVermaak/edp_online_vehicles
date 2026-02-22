app_name = "edp_online_vehicles"
app_title = "Edp Online Vehicles"
app_publisher = "NexTash"
app_description = "EDP ONLINE VEHICLES"
app_email = "support@nextash.com"
app_license = "mit"

# Apps
# ------------------

#
required_apps = ["hrms", "insights"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "edp_online_vehicles",
# 		# "logo": "/assets/edp_online_vehicles/logo.png",
# 		"title": "Edp Online",
# 		"route": "/edp_online_vehicles",
# 		# "has_permission": "edp_online_vehicles.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "edp_online_vehicles.bundle.css"
app_include_js = [
    "edp_online_vehicles1.bundle.js",
    "/assets/edp_online_vehicles/js/vehicles_service_scan.js",
    "/assets/edp_online_vehicles/js/recon_restrictions.js",
    "/assets/edp_online_vehicles/js/breadcrumb.js",
    "/assets/edp_online_vehicles/js/custom_nav_icon.js",
    "/assets/edp_online_vehicles/js/popup_cleanup.js",
    "/assets/edp_online_vehicles/js/hide_integration_workspaces.js",
    "/assets/edp_online_vehicles/js/default_order_report_view.js",
    "/assets/edp_online_vehicles/js/hide_searchbar.js",
]

# include js, css files in header of web template
web_include_css = "/assets/edp_online_vehicles/css/edp.css"
web_include_js = [
    "edp_online_vehicles.bundle.js",
    "/assets/edp_online_vehicles/js/session_expiration_redirect.js",
]

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "edp_online_vehicles/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Delivery Trip": "public/js/delivery_trip.js",
    "Employee Separation": "public/js/employee_separation.js",
    "Sales Invoice": "public/js/sales_invoice.js",
    "Company": "public/js/company.js",
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "edp_online_vehicles/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "/me"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "edp_online_vehicles.utils.jinja_methods",
# 	"filters": "edp_online_vehicles.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "edp_online_vehicles.install.before_install"
# after_install = "edp_online_vehicles.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "edp_online_vehicles.uninstall.before_uninstall"
# after_uninstall = "edp_online_vehicles.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "edp_online_vehicles.utils.before_app_install"
# after_app_install = "edp_online_vehicles.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "edp_online_vehicles.utils.before_app_uninstall"
# after_app_uninstall = "edp_online_vehicles.utils.after_app_uninstall"

# Migration
# ------------
# after_migrate = "edp_online_vehicles.edp_online_vehicles.settings.run_every_migrate"


# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "edp_online_vehicles.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
    "Vehicles Service": "edp_online_vehicles.permissions.vehicles_service_query",
    "Vehicle Stock": "edp_online_vehicles.permissions.vehicles_stock_query",
    "Vehicles Warranty Claims": "edp_online_vehicles.permissions.vehicles_warranty_query",
    "Request for Service": "edp_online_vehicles.permissions.request_for_service_query",
    "Vehicles Load Test": "edp_online_vehicles.permissions.vehicles_load_test_query",
    "Vehicles PDI Inspection": "edp_online_vehicles.permissions.vehicles_pdi_inspection_query",
    "Vehicle Buy Back": "edp_online_vehicles.permissions.vehicle_buy_back_query",
}

has_permission = {
    "Vehicles PDI Inspection": "edp_online_vehicles.edp_online_vehicles.doctype.vehicles_pdi_inspection.vehicles_pdi_inspection.has_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"DocShare": {
		"after_insert": "edp_online_vehicles.events.share_edp.after_insert",
	},
	"DocType": {"validate": "edp_online_vehicles.events.developer_validation.get_permission"},
	"Property Setter": {
		"validate": "edp_online_vehicles.events.developer_validation.get_permission"
	},
	"Custom Field": {"validate": "edp_online_vehicles.events.developer_validation.get_permission"},
	"ToDo": {"on_update": "edp_online_vehicles.events.share_edp.remove_share"},
	"Customer": {
		"autoname": "edp_online_vehicles.events.customer.autoname",
		"on_update": "edp_online_vehicles.events.customer_check_filed.update_vehicles_services",
	},
	"Delivery Trip": {
		"validate": "edp_online_vehicles.events.create_si.create_si_from_delivery_trip",
	},
	"Company": {
		"before_insert": "edp_online_vehicles.events.adjust_company_name.adjust_company_name",
		"after_insert": "edp_online_vehicles.events.create_customer.create_customer_if_checked",
	},
	"Sales Invoice": {
		"autoname": "edp_online_vehicles.events.create_si.sales_invoice_name",
	},
	"Pick List": {
		"before_insert": "edp_online_vehicles.events.sale_order_custom_job_reference.set_job_card_no_on_pick_list"
	},
	"Delivery Note": {
		"before_insert": "edp_online_vehicles.events.sale_order_custom_job_reference.set_job_card_no_delivery_note",
		"on_submit": [
			"edp_online_vehicles.events.generate_pdf.attach_pdf",
			"edp_online_vehicles.events.auto_move_stock.auto_move_stock_delivery_note",
            "edp_online_vehicles.events.parts.update_hq_from_dn_after_insert"
		],
        "on_update": "edp_online_vehicles.events.part_order.update_part_order",
	},
	"Stock Entry": {
		"on_submit": "edp_online_vehicles.edp_online_vehicles.doctype.vehicle_stock.vehicle_stock.set_vehicle_received_date",
	},
	"Employee Onboarding": {
		"on_submit": "edp_online_vehicles.events.create_final_seperation_doc.create_final_onboarding_doc"
	},
	"Employee Separation": {
		"on_submit": "edp_online_vehicles.events.create_final_seperation_doc.create_final_seperation_doc"
	},
	"Head Office Vehicle Orders": {
		"after_insert": "edp_online_vehicles.events.create_sales_order.create_sales_order_hq_equip_sale"
	},
	"Vehicles Dealer to Dealer Order": {
		"after_insert": "edp_online_vehicles.events.create_sales_order.create_sales_order_dealer_equip_sale"
	},
	"Payment Entry": {
		"on_submit": "edp_online_vehicles.events.check_sales_invoice.check_sales_invoice_on_payment"
	},
	"Item": {"after_insert": "edp_online_vehicles.events.check_item_settings.check_item_settings"},
    "Dealer Claims": {
        "validate": "edp_online_vehicles.edp_online_vehicles.doctype.dealer_claims.dealer_claims.dealer",
        "after_save": "edp_online_vehicles.edp_online_vehicles.doctype.dealer_claims.dealer_claims.after_save",
    },
}


# Scheduled Tasks
# ---------------

scheduler_events = {
    "daily": [
        "edp_online_vehicles.events.reserved_vehicles.update_reserved_vehicles_status",
        "edp_online_vehicles.edp_online_vehicles.doctype.dealer_claims.dealer_claims.update_claim_age",
    ],
    "cron": {
        "0 0 * * *": [
            "edp_online_vehicles.events.vehicle_aging.update_vehicle_aging",
        ],
        "* * * * *": [
            "edp_online_vehicles.events.check_orders.check_orders_schedule",
            "edp_online_vehicles.events.update_part_order.update_part_order_time",
            "edp_online_vehicles.events.reserved_vehicles.check_reserved_ordered_vehicles",
        ],
    },
}
# Testing
# -------

# before_tests = "edp_online_vehicles.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "edp_online_vehicles.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "edp_online_vehicles.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["edp_online_vehicles.utils.before_request"]
# after_request = ["edp_online_vehicles.utils.after_request"]

# Job Events
# ----------
# before_job = ["edp_online_vehicles.utils.before_job"]
# after_job = ["edp_online_vehicles.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

auth_hooks = ["edp_online_vehicles.auth.set_default"]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

fixtures = [
    {
        "dt": "Property Setter",
        "filters": [["name", "in", ["Delivery Trip-departure_time-reqd"]]],
    },
    {"dt": "Website Sidebar", "filters": [["name", "in", ["EDP Sidebar"]]]},
    {
        "dt": "Web Form",
        "filters": [
            ["name", "in", ["rfs", "vehicles-warranty-claim", "vehicles", "services"]]
        ],
    },
    {
        "dt": "Portal Settings",
        "filters": [
            [
                "name",
                "in",
                [
                    "Portal Settings",
                ],
            ]
        ],
    },

]

