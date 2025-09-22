frappe.ui.form.on("Login", {
	onload: function (frm) {
		const host = window.location.hostname;
		const isMahindra = [
			"msademo.edponline.co.za",
			"msa.edponline.co.za",
		].includes(host);

		if (isMahindra) {
			console.log("App Image size increased");

			const style = document.createElement("style");
			style.innerHTML = `
                img.app-logo {
                    display: block;
                    width: 500px;
                    height: auto;
                    max-height: none;
                    margin: 0 auto;
                }
            `;
			document.head.appendChild(style);
		}
	},
});
