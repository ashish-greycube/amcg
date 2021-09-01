# -*- coding: utf-8 -*-
# Copyright (c) 2021, GreyCube Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class BookingCT(Document):
	pass



# get all items that are descendants of a item group 
@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_items_in_item_group(doctype, txt, searchfield, start, page_len, filters):
	child_groups = ", ".join(['"' + i[0] + '"' for i in get_child_groups(filters.get('item_group'))])
	result= frappe.db.sql("""select  I.item_name from `tabItem` I
		where I.docstatus = 0 
		and I.disabled = 0
		and (I.item_group in (%s))""" % (child_groups))
	return result

def get_child_groups(item_group_name):
	item_group = frappe.get_doc("Item Group", item_group_name)
	return frappe.db.sql("""select name
		from `tabItem Group` where lft>=%(lft)s and rgt<=%(rgt)s
			""", {"lft": item_group.lft, "rgt": item_group.rgt})