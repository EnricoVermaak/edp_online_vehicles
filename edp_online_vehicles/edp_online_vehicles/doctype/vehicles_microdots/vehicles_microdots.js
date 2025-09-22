// Copyright (c) 2024, NexTash and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicles Microdots", {
	// refresh(frm){
	// 	// fetch_doctypes("Table", 'Vehicle Stock');
	// },
	after_save(frm) {
		frm.set_value("is_updated", 1);
	},
});

// let doctypes = [];
// let limit_start = 0;
// const limit_page_length = 1000;

// // Function to fetch DocTypes with pagination
// function fetch_doctypes(fieldtype, field_options) {
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "DocType",
//             fields: ["name"],
//             limit_start: limit_start,
//             limit_page_length: limit_page_length
//         },
//         callback: function (response) {
//             if (response.message && response.message.length > 0) {
//                 doctypes = doctypes.concat(response.message.map(d => d.name));
//                 limit_start += limit_page_length; // Update the starting point for next batch
//                 fetch_doctypes(fieldtype, field_options); // Recursive call to fetch more DocTypes
//             } else {
//                 // All DocTypes fetched, proceed to check for linked doctypes
//                 find_linked_doctypes(doctypes, fieldtype, field_options);
//             }
//         },
//         error: function (error) {
//             console.error("Error retrieving DocTypes:", error);
//         }
//     });
// }

// // Function to find linked DocTypes dynamically
// function find_linked_doctypes(doctypes, fieldtype, field_options) {
//     const linked_to_dynamic_field = [];

//     // Iterate through all DocTypes to find those linking dynamically
//     let promises = doctypes.map(doctype =>
//         frappe.call({
//             method: "frappe.client.get",
//             args: { doctype: "DocType", name: doctype },
//             callback: function (doc) {
//                 if (doc.message) {
//                     const fields = doc.message.fields;
//                     fields.forEach(field => {
//                         // Dynamically match fieldtype and options
//                         if (field.fieldtype === fieldtype && field.options === field_options) {
//                             linked_to_dynamic_field.push(doctype);
//                         }
//                     });
//                 }
//             }
//         })
//     );

//     // Wait for all API calls to complete
//     Promise.all(promises).then(() => {
//         console.log(
//              `DocTypes linked by "${field_options}":`,
//             linked_to_dynamic_field
//         );
//     });
// }

// // Call the fetching function with dynamic parameters
// // Example: Find all DocTypes linking to "
