(function () {
	let savedTheme = null;

	try {
		savedTheme = localStorage.getItem("theme");
	} catch {
		savedTheme = null;
	}

	if (savedTheme === "light" || savedTheme === "dark") {
		document.documentElement.dataset.theme = savedTheme;
		return;
	}

	if (window.matchMedia("(prefers-color-scheme: light)").matches) {
		document.documentElement.dataset.theme = "light";
		return;
	}

	document.documentElement.dataset.theme = "dark";
})();
