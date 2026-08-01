(function () {
  "use strict";

  const STORAGE_KEY = "yiyuiii.sunlight.v1";
  const root = document.documentElement;
  const button = document.getElementById("sunlight-toggle");
  const status = document.getElementById("sunlight-status");

  if (!button || !status) return;

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
    button.setAttribute(
      "aria-label",
      enabled ? button.dataset.disableLabel : button.dataset.enableLabel,
    );
    button.hidden = false;
    if (announce) {
      status.textContent = enabled
        ? button.dataset.statusOn
        : button.dataset.statusOff;
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
})();
