from __future__ import unicode_literals
import frappe
from frappe.utils import flt, get_link_to_form
from frappe import _


def update_operation_is_invoiced(self,method):
	if self.contract_type_cf=='Monthly Fixed Amount':
		uppaid_operations=frappe.db.get_list('Operation CT', 
		filters=[
			['operation_date', 'between', [self.from_operation_date_cf, self.to_operation_date_cf]],
			['customer','=',self.customer],
			['is_invoiced','=',0],
			['docstatus','=',1],
			['status',"not in", ["Re-Scheduled"]]
		])
		if uppaid_operations:
			list_of_updated_operations=[]
			for operation in uppaid_operations:
				frappe.db.set_value('Operation CT', operation.name, 'is_invoiced', 1)
				list_of_updated_operations.append(operation.name)

			if len(list_of_updated_operations)>0:
				list_of_updated_operations_string = '", "'.join(list_of_updated_operations)	
				frappe.msgprint(msg=_("Operation invoiced are {0}.".format(frappe.bold(list_of_updated_operations_string))), indicator='green',alert=True)
