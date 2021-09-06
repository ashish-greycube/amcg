// Copyright (c) 2021, GreyCube Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Operation CT', {
	discount_percent: function(frm) {
		if (frm.doc.discount_percent) {
			let net_amount=frm.doc.item_price+frm.doc.vat_amount
			frm.set_value('net_amount',flt(net_amount-((net_amount*frm.doc.discount_percent)/100)))
			frm.set_value('discount_amount',undefined)
		}
	},
	discount_amount: function(frm) {
		if (frm.doc.discount_amount) {
			let net_amount=frm.doc.item_price+frm.doc.vat_amount
			frm.set_value('net_amount',flt(net_amount-frm.doc.discount_amount))
			frm.set_value('discount_percent',undefined)
		}
	}	
});
