(() => {
  "use strict";

  const openHashTarget = (event) => {
    const hash = event?.detail?.hash || window.location.hash;
    if (!hash) return;

    let targetId;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch (_error) {
      return;
    }

    const target = document.getElementById(targetId);
    const disclosure = target?.matches("details")
      ? target
      : target?.closest("details");
    if (disclosure?.matches("[data-toy-disclosure]")) disclosure.open = true;
  };

  openHashTarget();
  window.addEventListener("hashchange", openHashTarget);
  window.addEventListener("yiyuiii:open-hash-target", openHashTarget);
})();
