$(document).ready(function () {
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Website Settings",
		},
		callback: function (response) {
			if (response && response.message) {
				const bannerImage = response.message.banner_image;
				if (bannerImage) {
					$(".navbar-brand .app-logo").attr("src", bannerImage);
				}
			}
		},
		error: function (error) {
			console.error("Failed to fetch Website Settings:", error);
		},
	});
});
