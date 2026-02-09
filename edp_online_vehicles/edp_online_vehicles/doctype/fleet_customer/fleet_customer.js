// Copyright (c) 2025, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Fleet Customer", {
	refresh(frm) {
		if (frappe.user.has_role("Dealer Vehicle Administrator") && frm.fields_dict.customer_type) {
			frm.set_df_property("customer_type", "read_only", 1);
		}

		if (frm.fields_dict.id_no && frm.fields_dict.id_no.input) {
			$(frm.fields_dict.id_no.input).off("blur.id_validation").on("blur.id_validation", function () {
				validate_fleet_id_no(frm);
			});
		}

		if (frm.doc.country) {
			frappe.call({
				method: "edp_online_vehicles.events.get_country_doc.get_country_doc",
				args: {
					country: frm.doc.country,
				},
				callback: function (r) {
					if (r.message) {
						var country_data = r.message;

						var region_options = [];

						(country_data.custom_regions || []).forEach(
							function (regions_row) {
								region_options.push({
									label: regions_row.region,
									value: regions_row.region,
								});
							},
						);

						var field = frm.fields_dict.province_state;
						field.df.options = region_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}
	},

	country(frm) {
		if (frm.doc.country) {
			frappe.call({
				method: "edp_online_vehicles.events.get_country_doc.get_country_doc",
				args: {
					country: frm.doc.country,
				},
				callback: function (r) {
					if (r.message) {
						var country_data = r.message;

						var region_options = [];

						(country_data.custom_regions || []).forEach(
							function (regions_row) {
								region_options.push({
									label: regions_row.region,
									value: regions_row.region,
								});
							},
						);

						var field = frm.fields_dict.province_state;
						field.df.options = region_options
							.map((option) => option.value)
							.join("\n");

						field.refresh();
					}
				},
			});
		}
	},

	before_save(frm) {
		if (frm.is_new() && frm.doc.company_reg_no) {
			const reg_no = frm.doc.company_reg_no;
			const cleaned_reg_no = reg_no.replace(/\s/g, "");

			frm.set_value("company_reg_no", cleaned_reg_no);
		}
	},
});

function validate_fleet_id_no(frm) {
	if (!frm.doc.id_no) return;
	frappe.db.get_single_value("System Settings", "country").then((country) => {
		if (country !== "South Africa") return;
		const id_number = frm.doc.id_no;
		if (!id_number || id_number.length !== 13 || isNaN(id_number)) {
			frappe.show_alert({ message: __("ID number must be 13 digits."), indicator: "red" }, 5);
			return;
		}
		if (validate_south_african_id(id_number)) {
			frappe.show_alert({ message: __("ID number is valid."), indicator: "green" }, 5);
			const birthdate = id_number.substr(0, 6);
			const age = calculate_age_from_id(birthdate);
			frm.set_value("age", age);
		} else {
			frappe.show_alert({ message: __("Invalid South African ID Number."), indicator: "red" }, 5);
		}
	});
}

function validate_south_african_id(id_number) {
	const birthdate = id_number.substr(0, 6);
	const citizenship = id_number.charAt(10);
	if (!is_valid_date_sa(birthdate)) return false;
	if (citizenship !== "0" && citizenship !== "1") return false;
	return validate_luhn_sa(id_number);
}

function is_valid_date_sa(birthdate) {
	const year = parseInt(birthdate.substr(0, 2), 10);
	const month = parseInt(birthdate.substr(2, 2), 10);
	const day = parseInt(birthdate.substr(4, 2), 10);
	if (month < 1 || month > 12) return false;
	if (day < 1 || day > 31) return false;
	if (month === 2) {
		if (day > 29) return false;
		if (day === 29 && !((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return false;
	}
	return true;
}

function validate_luhn_sa(id_number) {
	let sum = 0;
	let alternate = false;
	for (let i = id_number.length - 1; i >= 0; i--) {
		let n = parseInt(id_number.charAt(i), 10);
		if (alternate) {
			n *= 2;
			if (n > 9) n -= 9;
		}
		sum += n;
		alternate = !alternate;
	}
	return sum % 10 === 0;
}

function calculate_age_from_id(birthdate) {
	let year = parseInt(birthdate.substr(0, 2), 10);
	const month = parseInt(birthdate.substr(2, 2), 10) - 1;
	const day = parseInt(birthdate.substr(4, 2), 10);
	const currentYear = new Date().getFullYear();
	const currentTwoDigitYear = currentYear % 100;
	if (year > currentTwoDigitYear) year += 1900;
	else year += 2000;
	const birthDate = new Date(year, month, day);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDifference = today.getMonth() - birthDate.getMonth();
	if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
	if (age < 16) {
		year -= 100;
		birthDate.setFullYear(year);
		age = today.getFullYear() - birthDate.getFullYear();
	}
	return age;
}
