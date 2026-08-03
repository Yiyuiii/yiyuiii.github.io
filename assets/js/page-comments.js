(function () {
  "use strict";

  const GISCUS_ORIGIN = "https://giscus.app";

  const currentTheme = (root) =>
    document.documentElement.dataset.theme === "dark"
      ? root.dataset.darkTheme
      : root.dataset.lightTheme;

  const syncTheme = (root) => {
    const frame = root.querySelector("iframe.giscus-frame");
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: currentTheme(root) } } },
      GISCUS_ORIGIN,
    );
  };

  const createClient = (root) => {
    const script = document.createElement("script");
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = root.dataset.repo;
    script.dataset.repoId = root.dataset.repoId;
    script.dataset.category = root.dataset.category;
    script.dataset.categoryId = root.dataset.categoryId;
    script.dataset.mapping = root.dataset.mapping;
    script.dataset.strict = root.dataset.strict;
    script.dataset.reactionsEnabled = root.dataset.reactionsEnabled;
    script.dataset.emitMetadata = root.dataset.emitMetadata;
    script.dataset.inputPosition = root.dataset.inputPosition;
    script.dataset.theme = currentTheme(root);
    script.dataset.lang = root.dataset.giscusLang;
    script.dataset.loading = "lazy";
    return script;
  };

  const initialize = (root) => {
    const button = root.querySelector("[data-comments-load]");
    const status = root.querySelector("[data-comments-status]");
    const thread = root.querySelector("[data-comments-thread]");
    if (!button || !status || !thread) return;

    root.dataset.state = "idle";
    button.hidden = false;

    const load = () => {
      if (root.dataset.state === "loading" || root.dataset.state === "loaded") return;

      root.dataset.state = "loading";
      button.disabled = true;
      status.textContent = root.dataset.loadingText;
      thread.hidden = false;
      thread.replaceChildren();

      const script = createClient(root);
      script.addEventListener("load", () => {
        root.dataset.state = "loaded";
        button.hidden = true;
        button.disabled = false;
        status.textContent = "";
      });
      script.addEventListener("error", () => {
        root.dataset.state = "error";
        thread.replaceChildren();
        thread.hidden = true;
        button.disabled = false;
        button.hidden = false;
        button.textContent = root.dataset.retryText;
        status.textContent = root.dataset.errorText;
      });
      thread.append(script);
    };

    button.addEventListener("click", load);
    window.addEventListener("yiyuiii:themechange", () => syncTheme(root));
  };

  document.querySelectorAll("[data-page-comments]").forEach(initialize);
})();
