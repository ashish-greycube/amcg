frappe.ui.form.on('Sales Invoice', {
	refresh:function(frm){
		if (frm.doc.docstatus==0 && frm.doc.contract_type_cf=='Monthly-per-Operation' && frm.doc.customer) {
			console.log('monthly_per_operation_btn')
			monthly_per_operation_btn(frm);
		}
	},
	customer:function(frm){
		if (frm.doc.contract_type_cf && frm.doc.contract_type_cf=='Monthly Fixed Amount' && frm.doc.customer) {
			fill_monthly_fixed_amount_item(frm)
		}	
	
	},
	contract_type_cf:function(frm){
		if (frm.doc.contract_type_cf) {
			frm.toggle_reqd(["from_operation_date_cf","to_operation_date_cf"], frm.doc.contract_type_cf=='Monthly Fixed Amount'? true: false)			
			if (frm.doc.contract_type_cf=='Monthly Fixed Amount' && frm.doc.customer) {
				fill_monthly_fixed_amount_item(frm)
			}
			if (frm.doc.docstatus==0 && frm.doc.contract_type_cf=='Monthly-per-Operation' && frm.doc.customer) {
				console.log('monthly_per_operation_btn')
				monthly_per_operation_btn(frm);
			}else{
				frm.remove_custom_button('Operations: Monthly Per Operation',"Get items from")
			}			
		}else{
			frm.remove_custom_button('Operations: Monthly Per Operation',"Get items from")
		}
	

	}
	
})

function monthly_per_operation_btn(frm) {
frm.add_custom_button(__('Operations: Monthly Per Operation'),
		function() {
			erpnext.utils.map_current_doc({
				method: 	"amcg.amcg.doctype.operation_ct.operation_ct.make_sales_invoice_for_monthly_per_operation",
				source_doctype: "Operation CT",
				date_field: "operation_date",
				target: frm,
				setters: {
					customer: frm.doc.customer || undefined
				},
				get_query_filters: {
					docstatus: 1,
					is_invoiced: ["=", 0],
				}
			})
		}, __("Get items from"));
}

function fill_monthly_fixed_amount_item(frm){
	frappe.db.get_value('Customer', frm.doc.customer, 'monthly_fixed_amount_cf')
	.then(r => {
		let monthly_fixed_amount_cf = r.message.monthly_fixed_amount_cf
		if (monthly_fixed_amount_cf) {
			frappe.db.get_single_value('AMCG Settings', 'monthly_fixed_amount_item')
			.then(monthly_fixed_amount_item => {
				if (monthly_fixed_amount_item) {
					frm.clear_table("items");
					var si_item = frm.fields_dict.items.grid.add_new_row();
					// var si_item = frappe.model.add_child(frm.doc, 'Sales Invoice Item', 'items');
					frappe.model.set_value(si_item.doctype, si_item.name, 'item_code', monthly_fixed_amount_item);
					frappe.model.set_value(si_item.doctype, si_item.name, 'qty', 1);
					setTimeout(() => {
						frappe.model.set_value(si_item.doctype, si_item.name, 'rate', monthly_fixed_amount_cf);
					}, 350);
				}
			})	
		} 
		else{
			frappe.show_alert({
				message:__('No montly fixed amount value found for customer'),
				indicator:'red'
		}, 5);			
		}
	})	
}