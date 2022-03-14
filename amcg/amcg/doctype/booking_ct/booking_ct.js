// Copyright (c) 2021, GreyCube Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Booking CT', {
	setup:function(frm){
		frm.set_query('price_list', { 'buying': 1 });		
	},
	refresh: function (frm) {
		if (frm.doc.docstatus==1) {
			frm.add_custom_button(__('Convert to Operation'),
			function() {
				
				frappe.model.open_mapped_doc({
					method: "amcg.amcg.doctype.booking_ct.booking_ct.make_operation",
					frm: frm
				});					
			
			}, __("Tools"));
		}
	},
	item_code: function (frm) {
		if (frm.doc.item_code) {
			get_item_price(frm)
		}
	},
	item_price: function (frm) {
		calculate_vat_amount(frm)
	
	},
	vat_amount: function (frm) {
		calculate_net_amount(frm)

	},
	onload: function (frm) {
		filter_item_based_on_item_group(frm)
		set_price_list(frm)
		frm.trigger('citizenship')
	},
	item_group: function (frm) {
		filter_item_based_on_item_group(frm)
	},
	supplier: function (frm) {
		set_price_list(frm)
	},
	vat_tax_template: function (frm) {
		calculate_vat_amount(frm)
	},
	citizenship: function (frm) {
		if (frm.doc.citizenship == __('Non-Saudi')) {
			frappe.db.get_single_value('AMCG Settings', 'non_saudi_item_tax_template')
				.then(non_saudi_item_tax_template => {
					frm.set_value('vat_tax_template', non_saudi_item_tax_template)
				})
		}else if (frm.doc.citizenship == __('Saudi')){
			frappe.db.get_single_value('AMCG Settings', 'saudi_item_tax_template_zero_percent')
				.then(saudi_item_tax_template_zero_percent => {
					frm.set_value('vat_tax_template', saudi_item_tax_template_zero_percent)
				})
		}
	}
});

function calculate_net_amount(frm) {
	if (frm.doc.item_price) {
		let net_amount = flt(frm.doc.item_price + frm.doc.vat_amount)
		frm.set_value('net_amount', net_amount)
		frm.refresh_field('net_amount')
	}
}

function calculate_vat_amount(frm) {
	if (frm.doc.item_price && frm.doc.vat_tax_template) {
		frappe.call('amcg.amcg.doctype.booking_ct.booking_ct.get_tax_rate_for_item_template', {
			item_template_name: frm.doc.vat_tax_template
		}).then(r => {
				let vat_percentage = r.message
				let vat_amount = flt(frm.doc.item_price * vat_percentage / 100.0)
				frm.set_value('vat_amount', vat_amount)
				calculate_net_amount(frm)
		})
	}
}

function get_item_price(frm) {
	frappe.call({
		method: 'amcg.amcg.doctype.booking_ct.booking_ct.get_price_list_rate_for',
		args: {
			args: {
				supplier: frm.doc.supplier,
				price_list: frm.doc.price_list,
				qty: '1',
				transaction_date: frm.doc.booking_date
			},
			item_code: frm.doc.item_code
		},
		freeze: true,
		callback: (r) => {
			// on success
			frm.set_value('item_price', r.message)
		},
		error: (r) => {
			// on error
			console.log(r)
		}
	})
}

function filter_item_based_on_item_group(frm) {
	if (frm.doc.item_group) {
		frm.set_query('item_code', () => {
			return {
				query: 'amcg.amcg.doctype.booking_ct.booking_ct.get_items_in_item_group',
				filters: {
					item_group: frm.doc.item_group
				}
			}
		})
	}
}

function set_price_list(frm) {
	let default_price_list
	if (frm.doc.supplier) {
		frappe.db.get_value('Supplier', frm.doc.supplier, 'default_price_list')
			.then(r => {
				default_price_list = r.message.default_price_list
				if (default_price_list==null) {
					frappe.db.get_single_value('Buying Settings', 'buying_price_list')
						.then(buying_price_list => {
							console.log('buying_price_list',buying_price_list)
							default_price_list = buying_price_list
							if (default_price_list) {
								frm.set_value('price_list', default_price_list)
							}
						})

				} else {
					frm.set_value('price_list', default_price_list)
				}
			})
	}else{
		frappe.db.get_single_value('Buying Settings', 'buying_price_list')
		.then(buying_price_list => {
			default_price_list = buying_price_list
			if (default_price_list) {
				frm.set_value('price_list', default_price_list)
			}
		})
	}
}