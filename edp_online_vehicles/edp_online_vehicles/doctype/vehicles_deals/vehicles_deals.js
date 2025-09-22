// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Deals", {
	refresh: function (frm) {
		calculate_totalincl(frm);
	},
	price: function (frm) {
		calculate_totalincl(frm);
	},
	warranty_amt: function (frm) {
		calculate_totalincl(frm);
	},
	registration_fee: function (frm) {
		calculate_totalincl(frm);
	},
	service_fee: function (frm) {
		calculate_totalincl(frm);
	},
	extras_1_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_2_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_3_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_4_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_5_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_6_amt: function (frm) {
		calculate_totalincl(frm);
	},
	extras_7_amt: function (frm) {
		calculate_totalincl(frm);
	},
	deposit: function (frm) {
		calculate_totalincl(frm);
	},
});

function calculate_totalincl(frm) {
	var dealtotalexcl = 0;
	var dealtotalincl = 0;
	var dealvat = 0;

	var dealprice = frm.doc.price;
	var dealwarranty = frm.doc.warranty_amt;
	var dealregfee = frm.doc.registration_fee;
	var dealservfee = frm.doc.service_fee;
	var dealextras1 = frm.doc.extras_1_amt;
	var dealextras2 = frm.doc.extras_2_amt;
	var dealextras3 = frm.doc.extras_3_amt;
	var dealextras4 = frm.doc.extras_4_amt;
	var dealextras5 = frm.doc.extras_5_amt;
	var dealextras6 = frm.doc.extras_6_amt;
	var dealextras7 = frm.doc.extras_7_amt;
	var dealdeposit = frm.doc.deposit;

	dealtotalexcl =
		dealprice +
		dealwarranty +
		dealregfee +
		dealservfee +
		dealextras1 +
		dealextras2 +
		dealextras3 +
		dealextras4 +
		dealextras5 +
		dealextras6 +
		dealextras7;
	dealvat = dealtotalexcl * 0.15;
	dealtotalincl = dealtotalexcl + dealvat - dealdeposit;

	frm.set_value("total_excl", dealtotalexcl);
	frm.set_value("vat", dealvat);
	frm.set_value("total_incl", dealtotalincl);
}
