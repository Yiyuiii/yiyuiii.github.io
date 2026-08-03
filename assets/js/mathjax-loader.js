(() => {
  const loader = document.currentScript;
  if (!(loader instanceof HTMLScriptElement)) return;

  const root = document.documentElement;
  const runtime = {
    src: loader.dataset.runtimeSrc,
    integrity: loader.dataset.runtimeIntegrity,
  };
  const fontURL = loader.dataset.fontUrl;

  if (fontURL && window.MathJax) {
    window.MathJax.chtml = { ...window.MathJax.chtml, fontURL };
  }

  const loadScript = ({ src, integrity }) =>
    new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error("No local MathJax runtime is configured."));
        return;
      }
      const script = document.createElement("script");
      script.id = "MathJax-script-local";
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      if (integrity) script.integrity = integrity;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener(
        "error",
        () => {
          script.remove();
          reject(new Error("Unable to load the local MathJax runtime."));
        },
        { once: true },
      );
      document.head.append(script);
    });

  root.dataset.mathRendering = "loading";
  loadScript(runtime)
    .then(async () => {
      await window.MathJax?.startup?.promise;
      root.dataset.mathRendering = "ready";
      root.dataset.mathRenderingSource = "local";
      document.dispatchEvent(new CustomEvent("mathjax:ready"));
    })
    .catch((error) => {
      root.dataset.mathRendering = "failed";
      console.error(error);
    });
})();
