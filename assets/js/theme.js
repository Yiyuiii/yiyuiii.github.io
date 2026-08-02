(function () {
  "use strict";

  const STORAGE_KEY = "yiyuiii.theme.v1";
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const status = document.getElementById("theme-status");

  if (!button || !status) return;

  const addMermaidZoom = () => {
    if (typeof window.d3 === "undefined") return;
    window.d3.selectAll(".mermaid svg").each(function () {
      const svg = window.d3.select(this);
      svg.html(`<g>${svg.html()}</g>`);
      const inner = svg.select("g");
      svg.call(
        window.d3.zoom().on("zoom", (event) => {
          inner.attr("transform", event.transform);
        }),
      );
    });
  };

  const rerenderMermaid = (theme) => {
    if (typeof window.mermaid === "undefined") return;
    const diagrams = [...document.querySelectorAll(".mermaid")];
    if (diagrams.length === 0) return;

    const snapshots = diagrams.map((diagram) => ({
      diagram,
      html: diagram.innerHTML,
      processed: diagram.getAttribute("data-processed"),
      source: diagram.previousElementSibling?.querySelector(
        "code.language-mermaid",
      )?.textContent,
    }));
    if (snapshots.some(({ source }) => !source)) return;
    for (const { diagram, source } of snapshots) {
      diagram.removeAttribute("data-processed");
      diagram.textContent = source;
    }

    window.mermaid.initialize({ theme: theme === "dark" ? "dark" : "default" });
    const renderResult =
      typeof window.mermaid.run === "function"
        ? window.mermaid.run({ nodes: diagrams })
        : window.mermaid.init(undefined, diagrams);
    Promise.resolve(renderResult)
      .then(addMermaidZoom)
      .catch(() => {
        for (const { diagram, html, processed } of snapshots) {
          diagram.innerHTML = html;
          if (processed === null) diagram.removeAttribute("data-processed");
          else diagram.setAttribute("data-processed", processed);
        }
      });
  };

  const readPreference = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "light" || saved === "dark" ? saved : "light";
    } catch (error) {
      return "light";
    }
  };

  const render = (theme, announce) => {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute(
      "aria-label",
      isDark ? button.dataset.enableLightLabel : button.dataset.enableDarkLabel,
    );
    button.hidden = false;
    if (announce) {
      status.textContent = isDark
        ? button.dataset.statusDark
        : button.dataset.statusLight;
    }
    window.dispatchEvent(
      new CustomEvent("yiyuiii:themechange", { detail: { theme: isDark ? "dark" : "light" } }),
    );
    if (announce) rerenderMermaid(isDark ? "dark" : "light");
  };

  render(readPreference(), false);

  button.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    render(nextTheme, true);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      // The theme still changes for this page when storage is blocked.
    }
  });
})();
