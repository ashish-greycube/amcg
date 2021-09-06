# -*- coding: utf-8 -*-
# Copyright (c) 2021, GreyCube Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from six import string_types
import json, copy
from frappe.model.mapper import get_mapped_doc

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

# get item price, by passing item_code, qty and date
@frappe.whitelist()
def get_price_list_rate_for(args, item_code):
		from erpnext.stock.get_item_details import get_price_list_rate_for
		if isinstance(args, string_types):
			args = json.loads(args)
			args = frappe._dict(args)		
		result=get_price_list_rate_for(args,item_code)	
		return result		

# get tax rate from item template
@frappe.whitelist()
def get_tax_rate_for_item_template(item_template_name):
	tax_rate=0
	item_template=frappe.get_doc('Item Tax Template',item_template_name)
	taxes=item_template.get('taxes')
	for tax in taxes:
		if tax.tax_rate:
			tax_rate=tax.tax_rate
			break
	return tax_rate

@frappe.whitelist()
def make_operation(source_name, target_doc=None):
	doc = get_mapped_doc("Booking CT", source_name, {
		"Booking CT": {
			"doctype": "Operation CT",
			"validation": {
				"docstatus": ["=", 0]
			}
		}
	}, target_doc)

	return doc	