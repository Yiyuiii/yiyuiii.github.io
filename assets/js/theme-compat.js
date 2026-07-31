(() => {
  if (typeof window.determineComputedTheme !== "function") {
    window.determineComputedTheme = function () {
      return "light";
    };
  }
})();
