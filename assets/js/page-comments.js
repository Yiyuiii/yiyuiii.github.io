(function () {
  "use strict";

  const GISCUS_ORIGIN = "https://giscus.app";
  const AUTO_LOAD_STORAGE_KEY = "yiyuiii.comments.v1";
  const AUTO_LOAD_STORAGE_VALUE = "auto";

  const readsAutoLoadPreference = () => {
    try {
      return localStorage.getItem(AUTO_LOAD_STORAGE_KEY) === AUTO_LOAD_STORAGE_VALUE;
    } catch {
      return false;
    }
  };

  const savesAutoLoadPreference = (enabled) => {
    try {
      if (enabled) {
        localStorage.setItem(AUTO_LOAD_STORAGE_KEY, AUTO_LOAD_STORAGE_VALUE);
      } else {
        localStorage.removeItem(AUTO_LOAD_STORAGE_KEY);
      }
      return true;
    } catch {
      return false;
    }
  };

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
    const autoLoad = root.querySelector("[data-comments-auto-load]");
    const autoLoadOption = root.querySelector("[data-comments-auto-option]");
    const status = root.querySelector("[data-comments-status]");
    const thread = root.querySelector("[data-comments-thread]");
    if (!button || !autoLoad || !autoLoadOption || !status || !thread) return;

    root.dataset.state = "idle";
    button.hidden = false;
    autoLoad.checked = readsAutoLoadPreference();
    autoLoadOption.hidden = false;

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
    autoLoad.addEventListener("change", () => {
      const enabled = autoLoad.checked;
      if (!savesAutoLoadPreference(enabled)) {
        autoLoad.checked = readsAutoLoadPreference();
        status.textContent = root.dataset.autoLoadUnavailableText;
        return;
      }

      status.textContent = enabled
        ? root.dataset.autoLoadEnabledText
        : root.dataset.autoLoadDisabledText;
      if (enabled) load();
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== AUTO_LOAD_STORAGE_KEY && event.key !== null) return;
      autoLoad.checked =
        event.key === AUTO_LOAD_STORAGE_KEY && event.newValue === AUTO_LOAD_STORAGE_VALUE;
      if (autoLoad.checked) load();
    });
    window.addEventListener("yiyuiii:themechange", () => syncTheme(root));
    if (autoLoad.checked) load();
  };

  document.querySelectorAll("[data-page-comments]").forEach(initialize);
})();
