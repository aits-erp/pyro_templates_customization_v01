app_name = "pyro"
app_title = "Pyro"
app_publisher = "Your Name"
app_description = "Custom app for Pyro"
app_email = "you@example.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "pyro",
# 		"logo": "/assets/pyro/logo.png",
# 		"title": "Pyro",
# 		"route": "/pyro",
# 		"has_permission": "pyro.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/pyro/css/pyro.css"
# app_include_js = "/assets/pyro/js/pyro.js"

# include js, css files in header of web template
# web_include_css = "/assets/pyro/css/pyro.css"
# web_include_js = "/assets/pyro/js/pyro.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "pyro/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "pyro/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

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
# 	"methods": "pyro.utils.jinja_methods",
# 	"filters": "pyro.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "pyro.install.before_install"
# after_install = "pyro.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "pyro.uninstall.before_uninstall"
# after_uninstall = "pyro.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "pyro.utils.before_app_install"
# after_app_install = "pyro.utils.after_app_install"

# To set up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "pyro.utils.before_app_uninstall"
# after_app_uninstall = "pyro.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "pyro.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on Document Methods and Events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"pyro.tasks.all"
# 	],
# 	"daily": [
# 		"pyro.tasks.daily"
# 	],
# 	"hourly": [
# 		"pyro.tasks.hourly"
# 	],
# 	"weekly": [
# 		"pyro.tasks.weekly"
# 	],
# 	"monthly": [
# 		"pyro.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "pyro.install.before_tests"

# Overriding Methods
# ------------------------------

# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "pyro.event.get_events"
# }

# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "pyro.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Task"]

# Request Events
# ----------------
# before_request = ["pyro.utils.before_request"]
# after_request = ["pyro.utils.after_request"]

# Job Events
# ----------
# before_job = ["pyro.utils.before_job"]
# after_job = ["pyro.utils.after_job"]

# User Data Protection
# ---------------------

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

# auth_hooks = [
# 	"pyro.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }


# Fixtures
# --------
# Export Custom Field / Property Setter records scoped to Quotation Item
# (child table used in the Quotation's "Items" grid)

# fixtures = [
#     {
#         "dt": "Custom Field",
#         "filters": [
#             ["dt", "=", "Quotation Item"]
#         ]
#     },
#     {
#         "dt": "Property Setter",
#         "filters": [
#             ["doc_type", "=", "Quotation Item"]
#         ]
#     }
# ]

   
      

# fixtures = [
#     {
#         "dt": "Custom Field",
#         "filters": [
#             ["dt", "=", "Sales Order Item"]
#         ]
#     },

# ]

fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["module", "=", "pyro"]
        ]
    },
]


app_include_js = [
    "/assets/pyro/js/pyro_bulk_edit.js",
    "/assets/pyro/js/pyro_global.js",
    "/assets/pyro/js/pyro_multipoint_edit.js"
]