(() => {
  if (typeof window.determineComputedTheme !== "function") {
    window.determineComputedTheme = function () {
      return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    };
  }
})();
