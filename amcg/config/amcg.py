from __future__ import unicode_literals
from frappe import _
import frappe


def get_data():
	return [
			{
			"label": _("Transactions"),
			"icon": "fa fa-print",
			"items": [
				{
					"type": "doctype",
					"name": "Booking CT",
					"label": _("Booking"),
					"description": _("Booking"),
					"hide_count": False
				},
				{
					"type": "doctype",
					"name": "Operation CT",
					"label": _("Operation"),
					"description": _("Operation"),
					"hide_count": False
				}	,
				{
					"type": "doctype",
					"name": "Sales Invoice",
					"label": _("Sales Invoice"),
					"description": _("Sales Invoice"),
					"hide_count": False
				}										
			]
		},
			{
			"label": _("Master"),
			"icon": "fa fa-print",
			"items": [
								{
					"type": "doctype",
					"name": "Hospital CT",
					"label": _("Hospital"),
					"description": _("Hospital"),
					"hide_count": False
				},
				{
					"type": "doctype",
					"name": "Customer",
					"label": _("Customer"),
					"description": _("Customer"),
					"hide_count": False
				},
				{
					"type": "doctype",
					"name": "Item",
					"label": _("Item"),
					"description": _("Item"),
					"hide_count": False
				}				
			]
		},		
			{
			"label": _("Setup"),
			"icon": "fa fa-print",
			"items": [
				{
					"type": "doctype",
					"name": "AMCG Settings",
					"label": _("AMCG Settings"),
					"description": _("AMCG Settings"),
				},
				{
					"type": "doctype",
					"name": "Item Tax Template",
					"label": _("Item Tax Template"),
					"description": _("Item Tax Template"),
					"hide_count": False
				}				
			]
		}
    ]
