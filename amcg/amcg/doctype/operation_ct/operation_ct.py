# -*- coding: utf-8 -*-
# Copyright (c) 2021, GreyCube Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_link_to_form
from frappe import _
from frappe.model.mapper import get_mapped_doc
from erpnext.stock.get_item_details import get_item_tax_map


class OperationCT(Document):
	def on_submit(self):
		if len(self.operation_item)>0:
			stock_entry=self.make_stock_entry()
			success_msg = _('Stock Entry {0} created').format(
				frappe.bold(get_link_to_form('Stock Entry', stock_entry)))
			frappe.msgprint(success_msg, title=_('Success'), indicator='green')	

		if self.contract_type	== 'Per-Operation':
			purchase_invoice=self.make_purchase_invoice_for_per_operation(self.name)
			success_msg = _('Purchase Invoice {0} created').format(
				frappe.bold(get_link_to_form('Purchase Invoice', purchase_invoice)))
			frappe.msgprint(success_msg, title=_('Success'), indicator='green')					



	def make_stock_entry(self):
		default_company = frappe.db.get_single_value('Global Defaults', 'default_company')
		default_warehouse = frappe.db.get_single_value('Stock Settings', 'default_warehouse')
		
		stock_entry = frappe.new_doc('Stock Entry')
		stock_entry.purpose = 'Material Issue'
		stock_entry.set_stock_entry_type()
		# stock_entry.from_warehouse = self.warehouse
		stock_entry.company = default_company
		# cost_center = frappe.get_cached_value('Company',  self.company,  'cost_center')
		# expense_account = get_account(None, 'expense_account', 'Healthcare Settings', self.company)

		for entry in self.operation_item:
			se_child = stock_entry.append('items')
			se_child.item_code = entry.item_code
			se_child.item_name = entry.item_name
			se_child.s_warehouse=entry.warehouse or default_warehouse
			se_child.uom = frappe.db.get_value('Item', entry.item_code, 'stock_uom')
			se_child.stock_uom = entry.stock_uom
			se_child.qty = flt(entry.qty)
			if entry.get('batch_no_'):
				se_child.batch_no=entry.batch_no_
			# in stock uom
			se_child.conversion_factor = 1
			# se_child.cost_center = cost_center
			# se_child.expense_account = expense_account
			# references
			# se_child.patient = entry.patient
			# se_child.inpatient_medication_entry_child = entry.name
		stock_entry.set_missing_values()
		stock_entry.submit()
		return stock_entry.name

	@frappe.whitelist()
	def make_purchase_invoice_for_per_operation(self,source_name, target_doc=None, ignore_permissions=False):
		default_company = frappe.db.get_single_value('Global Defaults', 'default_company')
		monthly_fixed_amount_item=frappe.db.get_single_value('AMCG Settings', 'monthly_fixed_amount_item')
		default_receivable_account = frappe.db.get_value('Company', default_company, 'default_receivable_account')	
		def postprocess(source, target):
			# source.company = default_company
			target.supplier=source.supplier
			target.contract_type_cf=source.contract_type
			# target.ignore_pricing_rule=1
			# target.currency = frappe.get_cached_value('Company',  default_company,  "default_currency")
			# target.due_date=frappe.utils.nowdate()
			# target.debit_to=default_receivable_account		
			pi_item =target.append('items')
			pi_item.item_code=monthly_fixed_amount_item
			pi_item.qty=1
			pi_item.rate=source.item_price_after_discount
			pi_item.base_rate=source.item_price_after_discount
			pi_item.item_tax_template=source.vat_tax_template
			pi_item.item_tax_rate=get_item_tax_map(default_company,source.vat_tax_template)
			pi_item.reference_operation_ct=source.name
			set_missing_values(source, target)

		def set_missing_values(source, target):
			target.discount_amount=0
			if source.price_list:
				target.buying_price_list=source.price_list			
			target.ignore_pricing_rule = 1
			target.flags.ignore_permissions = True
			target.run_method("set_missing_values")
			target.run_method("set_other_charges")
			target.run_method("calculate_taxes_and_totals")
			# target.run_method("calculate_rate_and_amount")
			# target.run_method("onload")


		doclist = get_mapped_doc("Operation CT", source_name, {
			"Operation CT": {
				"doctype": "Purchase Invoice",
				"validation": {
					"docstatus": ["=", 1]
				}
			}
		}, target_doc, postprocess, ignore_permissions=ignore_permissions)
		doclist.save(ignore_permissions)
		return doclist.name	

@frappe.whitelist()
def make_purchase_invoice_for_monthly_per_operation(source_name, target_doc=None, ignore_permissions=False):
	default_company = frappe.db.get_single_value('Global Defaults', 'default_company')
	def postprocess(source, target):
		pi_item =target.append('items')
		pi_item.item_code=source.item_code
		pi_item.qty=1
		pi_item.rate=source.item_price_after_discount
		pi_item.base_rate=source.item_price_after_discount
		pi_item.item_tax_template=source.vat_tax_template
		pi_item.item_tax_rate=get_item_tax_map(default_company,source.vat_tax_template)
		pi_item.reference_operation_ct=source.name
		set_missing_values(source, target)



	def set_missing_values(source, target):
		target.contract_type_cf=source.contract_type
		target.discount_amount=0
		if source.price_list:
			target.buying_price_list=source.price_list
		target.ignore_pricing_rule = 1
		target.flags.ignore_permissions = True
		target.run_method("set_missing_values")
		target.run_method("set_other_charges")
		target.run_method("calculate_taxes_and_totals")

	doclist = get_mapped_doc("Operation CT", source_name, {
		"Operation CT": {
			"doctype": "Purchase Invoice",
			"validation": {
				"docstatus": ["=", 1]
			}
		}
	}, target_doc, postprocess, ignore_permissions=ignore_permissions)

	return doclist		

@frappe.whitelist()
def get_product_bundle_items(item_code):
	# from erpnext.stock.doctype.packed_item.packed_item import get_product_bundle_items
	default_company = frappe.db.get_single_value('Global Defaults', 'default_company')
	return frappe.db.sql("""select t1.item_code,i.item_name,t1.qty, t1.uom, i.stock_uom,t1.description,id.default_warehouse as warehouse
		from `tabProduct Bundle Item` t1
		inner join `tabProduct Bundle` t2
		on t1.parent = t2.name 
		inner join `tabItem` i 
		on i.item_code=t2.name
		LEFT JOIN `tabItem Default` id 
		ON id.parent=i.name and id.company=%s
		where t2.new_item_code=%s 
		order by t1.idx""", (default_company,item_code), as_dict=1)