// Copyright (c) 2021, GreyCube Technologies and contributors
// For license information, please see license.txt
var sourceImageTop ;
var targetRootTop;

var sourceImageBottom ;
var targetRootBottom;

frappe.ui.form.on('Operation CT', {
	onload_post_render: function(frm) {
    // Top
		$(frm.fields_dict['top_body'].wrapper)
    .html('<div  style="position: relative; display: flex;flex-direction: column;align-items: center;justify-content: center;padding-top: 50px;"> \
    <img  id="sourceImageTop"   src="/assets/amcg/image/top.png" style="max-width: 430px; max-height: 80%;"  crossorigin="anonymous" /> \
    <img  id="sampleImageTop"   src="/assets/amcg/image/top.png"  style="max-width: 430px; max-height: 100%; position: absolute;" crossorigin="anonymous" /> \
    </div>');

    setSourceImageTop(document.getElementById("sourceImageTop"));

    const sampleImageTop = document.getElementById("sampleImageTop");
    sampleImageTop.addEventListener("click", () => {
      showMarkerAreaTop(sampleImageTop);
    });  
		
		// Bottom
		$(frm.fields_dict['bottom_body'].wrapper)
    .html('<div  style="position: relative; display: flex;flex-direction: column;align-items: center;justify-content: center;padding-top: 50px;"> \
    <img  id="sourceImageBottom"   src="/assets/amcg/image/bottom.png" style="max-width: 430px; max-height: 80%;"  crossorigin="anonymous" /> \
    <img  id="sampleImageBottom"   src="/assets/amcg/image/bottom.png"  style="max-width: 430px; max-height: 100%; position: absolute;" crossorigin="anonymous" /> \
    </div>');

    setSourceImageBottom(document.getElementById("sourceImageBottom"));

    const sampleImageBottom = document.getElementById("sampleImageBottom");
    sampleImageBottom.addEventListener("click", () => {
      showMarkerAreaBottom(sampleImageBottom);
    });  		

  },
	discount_percent: function(frm) {
		frm.via_discount_percentage = true;
			let discount_amount=flt((frm.doc.item_price*frm.doc.discount_percent)/100)
			let item_price_after_discount=flt(frm.doc.item_price-discount_amount)
			frm.set_value('item_price_after_discount',item_price_after_discount)
			calculate_vat_amount(frm)
			let net_amount=flt(item_price_after_discount+frm.doc.vat_amount)
			frm.set_value('net_amount',net_amount)
			frm.set_value("discount_amount", discount_amount)
				.then(() => delete frm.via_discount_percentage);			
	},
	discount_amount: function(frm) {
			if (!frm.via_discount_percentage) {
				let discount_amount=frm.doc.discount_amount
				let item_price_after_discount=flt(frm.doc.item_price-frm.doc.discount_amount)
				frm.set_value('item_price_after_discount',item_price_after_discount)
				calculate_vat_amount(frm)
				let net_amount=item_price_after_discount+frm.doc.vat_amount
				frm.set_value('net_amount',flt(net_amount))
				frm.set_value('discount_percent',flt((discount_amount/frm.doc.item_price)*100))
			}	
	}	,
	item_code: function (frm) {
		if (frm.doc.item_code) {
			get_item_price(frm)
			fill_operation_items(frm)
		}
	},
	item_price: function (frm) {
		if (frm.doc.discount_amount==0 && frm.doc.discount_percent=='0') {
			frm.doc.item_price_after_discount=frm.doc.item_price
		}
		calculate_vat_amount(frm)
	
	},
	vat_amount: function (frm) {
		calculate_net_amount(frm)

	},
	validate:function(frm){
		if (frm.doc.discount_amount==0 && frm.doc.discount_percent=='0') {
			frm.doc.item_price_after_discount=frm.doc.item_price
		}
		calculate_vat_amount(frm)		
	},
	setup: function (frm) {
		filter_item_based_on_item_group(frm)
		frm.set_query('price_list', { 'buying': 1 });
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
function fill_operation_items(frm) {
	frappe.call('amcg.amcg.doctype.operation_ct.operation_ct.get_product_bundle_items', {
		item_code: frm.doc.item_code
	}).then(r => {
			let operation_items = r.message
			frm.set_value('operation_item', operation_items)
	})	
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

function calculate_vat_amount(frm) {
	if (frm.doc.item_price && frm.doc.vat_tax_template) {
		frappe.call('amcg.amcg.doctype.booking_ct.booking_ct.get_tax_rate_for_item_template', {
			item_template_name: frm.doc.vat_tax_template
		}).then(r => {
				let vat_percentage = r.message
				let vat_amount = flt(frm.doc.item_price_after_discount * vat_percentage / 100.0)
				frm.set_value('vat_amount', vat_amount)
				calculate_net_amount(frm)
		})
	}
}

function calculate_net_amount(frm) {
	if (frm.doc.item_price) {
		frm.set_value('item_price_after_discount',flt(frm.doc.item_price-frm.doc.discount_amount))
		frm.set_value('net_amount',flt(frm.doc.item_price_after_discount+frm.doc.vat_amount))		
		// frm.set_value('net_amount', net_amount)
		// frm.refresh_field('net_amount')
	}
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
	if (frm.doc.price_list==undefined || frm.doc.price_list=='') {
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


}
// Top
function setSourceImageTop(source) {
  sourceImageTop = source;
  targetRootTop = source.parentElement;
}
function showMarkerAreaTop(target) {
  const markerArea = new markerjs2.MarkerArea(sourceImageTop);
    markerArea.renderImageQuality = 0.5;
    markerArea.renderImageType = 'image/jpeg';

  // since the container div is set to position: relative it is now our positioning root
  // end we have to let marker.js know that
  markerArea.targetRoot = targetRootTop;
  markerArea.addRenderEventListener((imgURL, state) => {
    target.src = imgURL;
    // save the state of MarkerArea
    cur_frm.doc.top_body_annotation=JSON.stringify(state)
   
    cur_frm.set_value('annotated_top_body_image', imgURL)
    cur_frm.save()
  });
  markerArea.show();
  // if previous state is present - restore it
  if (cur_frm.doc.top_body_annotation) {
    markerArea.restoreState(JSON.parse(cur_frm.doc.top_body_annotation));
  }
}

// Bottom
function setSourceImageBottom(source) {
  sourceImageBottom = source;
  targetRootBottom = source.parentElement;
}
function showMarkerAreaBottom(target) {
  const markerArea = new markerjs2.MarkerArea(sourceImageBottom);
    markerArea.renderImageQuality = 0.5;
    markerArea.renderImageType = 'image/jpeg';

  // since the container div is set to position: relative it is now our positioning root
  // end we have to let marker.js know that
  markerArea.targetRoot = targetRootBottom;
  markerArea.addRenderEventListener((imgURL, state) => {
    target.src = imgURL;
    // save the state of MarkerArea
    cur_frm.doc.bottom_body_annotation=JSON.stringify(state)
   
    cur_frm.set_value('annotated_bottom_body_image', imgURL)
    cur_frm.save()
  });
  markerArea.show();
  // if previous state is present - restore it
  if (cur_frm.doc.bottom_body_annotation) {
    markerArea.restoreState(JSON.parse(cur_frm.doc.bottom_body_annotation));
  }
}