# -*- coding: utf-8 -*-
# Copyright (c) 2021, GreyCube Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import flt, get_link_to_form
from frappe import _
from frappe.model.mapper import get_mapped_doc

class OperationCT(Document):
	def on_submit(self):
		if len(self.operation_item)>0:
			stock_entry=self.make_stock_entry()
			success_msg = _('Stock Entry {0} created').format(
				frappe.bold(get_link_to_form('Stock Entry', stock_entry)))
			frappe.msgprint(success_msg, title=_('Success'), indicator='green')	

		if self.contract_type	== 'Per-Operation':
			sales_invoice=self.make_sales_invoice_for_per_operation()
			self.is_invoiced=1
			success_msg = _('Sales Invoice {0} created').format(
				frappe.bold(get_link_to_form('Sales Invoice', sales_invoice)))
			frappe.msgprint(success_msg, title=_('Success'), indicator='green')					

	def on_cancel(self):
		pass



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
	def make_sales_invoice_for_per_operation(self):
		default_company = frappe.db.get_single_value('Global Defaults', 'default_company')
		monthly_fixed_amount_item=frappe.db.get_single_value('AMCG Settings', 'monthly_fixed_amount_item')
		default_receivable_account = frappe.db.get_value('Company', default_company, 'default_receivable_account')
		si = frappe.new_doc("Sales Invoice")
		si.company = default_company
		si.customer=self.customer
		si.ignore_pricing_rule=1
		si.currency = frappe.get_cached_value('Company',  default_company,  "default_currency")
		si.due_date=frappe.utils.nowdate()
		si.debit_to=default_receivable_account
		si.append("items", {
			"item_code": monthly_fixed_amount_item,
			"qty": 1,
			"rate":self.item_price_after_discount,
			"base_rate":self.item_price_after_discount,
			"item_tax_template":self.vat_tax_template,
			"reference_operation_ct":self.name
		})
		si.set_missing_values()
		si.save()
		return si.name		

@frappe.whitelist()
def make_sales_invoice_for_monthly_per_operation(source_name, target_doc=None, ignore_permissions=False):
	def postprocess(source, target):
		si_item =target.append('items')
		si_item.item_code=source.item_code
		si_item.qty=1
		si_item.rate=source.item_price_after_discount
		si_item.base_rate=source.item_price_after_discount
		si_item.item_tax_template=source.vat_tax_template
		si_item.reference_operation_ct=source.name
		set_missing_values(source, target)



	def set_missing_values(source, target):
		target.ignore_pricing_rule = 1
		target.flags.ignore_permissions = True
		target.run_method("set_missing_values")
		target.run_method("calculate_taxes_and_totals")

	doclist = get_mapped_doc("Operation CT", source_name, {
		"Operation CT": {
			"doctype": "Sales Invoice",
			"validation": {
				"docstatus": ["=", 1]
			}
		}
	}, target_doc, postprocess, ignore_permissions=ignore_permissions)

	return doclist		