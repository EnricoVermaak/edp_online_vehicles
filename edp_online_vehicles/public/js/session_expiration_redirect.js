var sessionCheckInterval = setInterval(function () {
	// If already on login page, stop further checks.
	if ( 
		window.location.pathname === "/login" ||
		window.location.pathname === "/apps" ||
		window.location.pathname === "/update-password"
	) {
		clearInterval(sessionCheckInterval);

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

		return;
	}

	$.ajax({
		url: "/api/method/frappe.session.user",
		method: "GET",
		success: function (data) {
			// Session is still valid
		},
		error: function (xhr) {
			if (xhr.status === 417 || xhr.status === 403) {
				const host = window.location.hostname;
				const isMahindra = [
					"msademo.edponline.co.za",
					"msa.edponline.co.za",
				].includes(host);

				if (isMahindra) {
					console.log(
						"Session expired detected; redirecting to login",
					);
					window.location.href = "/login";
					clearInterval(sessionCheckInterval);
				}
			}
		},
	});
}, 10);
