(() => {
  "use strict";

  const dialog = document.querySelector("#site-search");
  const toggle = document.querySelector("#search-toggle");
  const closeButton = document.querySelector("#search-close");
  const input = document.querySelector("#site-search-input");
  const status = document.querySelector("#search-status");
  const results = document.querySelector("#search-results");
  const dataElement = document.querySelector("#site-search-data");

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  if (dialog && toggle && closeButton && input && status && results && dataElement) {
    let items = [];
    try {
      items = JSON.parse(dataElement.textContent || "[]");
    } catch (_error) {
      items = [];
    }

    const searchableText = (item) =>
      normalize([item.title, item.description, ...(item.tags || [])].join(" "));

    const appendTextElement = (parent, className, value) => {
      const element = document.createElement("span");
      element.className = className;
      element.textContent = value || "";
      parent.append(element);
    };

    const render = () => {
      const query = normalize(input.value);
      results.replaceChildren();

      if (!query) {
        status.textContent = dialog.dataset.empty || "";
        return;
      }

      const matches = items
        .filter((item) => searchableText(item).includes(query))
        .slice(0, 12);
      status.textContent = matches.length
        ? `${matches.length}`
        : dialog.dataset.noResults || "";

      for (const item of matches) {
        const row = document.createElement("li");
        const link = document.createElement("a");
        link.href = item.url;
        if (item.external) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        appendTextElement(link, "search-result__kind", item.kind);
        appendTextElement(link, "search-result__title", item.title);
        if (item.description) {
          appendTextElement(link, "search-result__description", item.description);
        }
        row.append(link);
        results.append(row);
      }
    };

    const open = () => {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      input.focus();
    };

    const close = () => {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
        toggle.focus();
      }
    };

    const followResult = (event) => {
      const link = event.target.closest("a[href]");
      if (!link || !results.contains(link) || link.target === "_blank") return;

      const destination = new URL(link.href, window.location.href);
      const sameDocument = destination.origin === window.location.origin
        && destination.pathname === window.location.pathname
        && destination.search === window.location.search;
      close();
      if (!sameDocument || !destination.hash) return;

      event.preventDefault();
      if (window.location.hash !== destination.hash) {
        window.history.pushState(null, "", destination);
      }
      window.dispatchEvent(new CustomEvent("yiyuiii:open-hash-target", {
        detail: { hash: destination.hash },
      }));
      document.getElementById(decodeURIComponent(destination.hash.slice(1)))?.scrollIntoView();
    };

    toggle.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    results.addEventListener("click", followResult);
    input.addEventListener("input", render);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const first = results.querySelector("a");
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("close", () => toggle.focus());
  }

  const applyTagFilter = () => {
    const selected = normalize(new URL(window.location.href).searchParams.get("tag"));
    const lists = document.querySelectorAll("[data-filter-list]");

    for (const list of lists) {
      const entries = [
        ...list.querySelectorAll("[data-filter-entry][data-tags]"),
      ];
      let visible = 0;
      for (const entry of entries) {
        const tags = String(entry.dataset.tags || "")
          .split("|")
          .map(normalize)
          .filter(Boolean);
        const show = !selected || tags.includes(selected);
        entry.hidden = !show;
        if (show) {
          visible += 1;
        }
      }

      const emptyState = list.querySelector("[data-filter-empty]");
      if (emptyState) {
        emptyState.hidden = visible !== 0;
      }
    }
  };

  const showMissingTranslationNotice = () => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("missing_translation")) {
      return;
    }
    const message = dialog ? dialog.dataset.missingTranslation : "";
    const main = document.querySelector("#main-content");
    if (!message || !main) {
      return;
    }
    const notice = document.createElement("p");
    notice.className = "translation-notice";
    notice.setAttribute("role", "status");
    notice.textContent = message;
    main.prepend(notice);
  };

  window.addEventListener("popstate", applyTagFilter);
  applyTagFilter();
  showMissingTranslationNotice();
})();
