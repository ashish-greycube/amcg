// Copyright (c) 2021, GreyCube Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Booking CT', {
	setup: function (frm) {
		filter_item_based_on_item_group(frm)
		set_price_list(frm)
	},
	item_group: function (frm) {
		filter_item_based_on_item_group(frm)
	},
	customer: function (frm) {
		set_price_list(frm)
	}

});

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
if (frm.doc.customer) {
	let default_price_list
	frappe.db.get_value('Customer', frm.doc.customer, 'default_price_list')
			.then(r => {
					default_price_list=r.message.default_price_list
					if (!default_price_list) {
						frappe.db.get_single_value('Selling Settings', 'selling_price_list')
						.then(selling_price_list => {
							default_price_list=selling_price_list
							if (default_price_list) {
								frm.set_value('price_list', default_price_list)							
							}
						})
									
					}else{
						frm.set_value('price_list', default_price_list)	
					}
			})	
}	


}