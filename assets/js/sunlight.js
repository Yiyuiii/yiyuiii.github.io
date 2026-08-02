(function () {
  "use strict";

  const STORAGE_KEY = "yiyuiii.sunlight.v1";
  const root = document.documentElement;
  const button = document.getElementById("sunlight-toggle");
  const fallbackLink = document.getElementById("sunlight-fallback-link");
  const status = document.getElementById("sunlight-status");

  if (!button || !fallbackLink || !status) return;

  const readPreference = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "on" || saved === "off" ? saved : "on";
    } catch (error) {
      return "on";
    }
  };

  const render = (enabled, announce) => {
    root.dataset.sunlight = enabled ? "on" : "off";
    button.setAttribute("aria-pressed", String(enabled));
    const theme = root.dataset.theme === "dark" ? "dark" : "light";
    const mode = theme === "dark" ? "Dark" : "Light";
    button.setAttribute(
      "aria-label",
      enabled
        ? button.dataset[`disable${mode}Label`]
        : button.dataset[`enable${mode}Label`],
    );
    fallbackLink.hidden = true;
    button.hidden = false;
    if (announce) {
      status.textContent = button.dataset[`status${mode}${enabled ? "On" : "Off"}`];
    }
  };

  render(readPreference() === "on", false);

  button.addEventListener("click", () => {
    const enabled = button.getAttribute("aria-pressed") !== "true";
    render(enabled, true);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch (error) {
      // The visual choice still applies for this page when storage is blocked.
    }
  });

  window.addEventListener("yiyuiii:themechange", () => {
    render(button.getAttribute("aria-pressed") === "true", false);
  });
})();
