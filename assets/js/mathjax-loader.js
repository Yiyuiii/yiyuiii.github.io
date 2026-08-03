(() => {
  const loader = document.currentScript;
  if (!(loader instanceof HTMLScriptElement)) return;

  const root = document.documentElement;
  const candidates = [
    {
      name: "primary",
      src: loader.dataset.primarySrc,
      integrity: loader.dataset.primaryIntegrity,
    },
    {
      name: "fallback",
      src: loader.dataset.fallbackSrc,
      integrity: loader.dataset.fallbackIntegrity,
    },
  ].filter(({ src }) => Boolean(src));

  const loadScript = ({ name, src, integrity }) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = `MathJax-script-${name}`;
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      if (integrity) script.integrity = integrity;
      script.addEventListener("load", () => resolve(name), { once: true });
      script.addEventListener(
        "error",
        () => {
          script.remove();
          reject(new Error(`Unable to load the ${name} MathJax runtime.`));
        },
        { once: true },
      );
      document.head.append(script);
    });

  const loadFirstAvailable = async () => {
    let lastError = new Error("No MathJax runtime is configured.");
    for (const candidate of candidates) {
      try {
        return await loadScript(candidate);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  root.dataset.mathRendering = "loading";
  loadFirstAvailable()
    .then(async (source) => {
      await window.MathJax?.startup?.promise;
      root.dataset.mathRendering = "ready";
      root.dataset.mathRenderingSource = source;
      document.dispatchEvent(new CustomEvent("mathjax:ready"));
    })
    .catch((error) => {
      root.dataset.mathRendering = "failed";
      console.error(error);
    });
})();
