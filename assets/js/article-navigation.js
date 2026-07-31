(() => {
  const trigger = document.querySelector("[data-article-section-trigger]");
  const dialog = document.querySelector("[data-article-section-dialog]");
  const closeButton = document.querySelector("[data-article-section-close]");
  const navigations = Array.from(
    document.querySelectorAll("[data-article-navigation]"),
  );
  const headings = Array.from(
    document.querySelectorAll(
      "#markdown-content h2[id], #markdown-content h3[id]",
    ),
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideLayout = window.matchMedia("(min-width: 1180px)");
  let sectionNavigationPending = false;

  const decodeHash = (value) => {
    if (!value || !value.startsWith("#")) return "";
    try {
      return decodeURIComponent(value.slice(1));
    } catch {
      return value.slice(1);
    }
  };

  const links = navigations.flatMap((navigation) =>
    Array.from(navigation.querySelectorAll('a[href^="#"]')),
  );

  const keepLinkVisible = (link) => {
    const navigation = link.closest("[data-article-navigation]");
    if (!navigation || navigation.getClientRects().length === 0) return;
    const navRect = navigation.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (linkRect.top < navRect.top) {
      navigation.scrollTop -= navRect.top - linkRect.top;
    } else if (linkRect.bottom > navRect.bottom) {
      navigation.scrollTop += linkRect.bottom - navRect.bottom;
    }
  };

  const setActiveSection = (id) => {
    for (const link of links) {
      const isCurrent = decodeHash(link.getAttribute("href")) === id;
      if (isCurrent) {
        link.setAttribute("aria-current", "location");
        keepLinkVisible(link);
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };

  if (trigger && dialog && closeButton) {
    trigger.addEventListener("click", () => {
      sectionNavigationPending = false;
      dialog.showModal();
      trigger.setAttribute("aria-expanded", "true");
    });

    closeButton.addEventListener("click", () => {
      sectionNavigationPending = false;
      dialog.close();
    });

    dialog.addEventListener("close", () => {
      trigger.setAttribute("aria-expanded", "false");
      if (!sectionNavigationPending) {
        trigger.focus({ preventScroll: true });
      }
      sectionNavigationPending = false;
    });

    wideLayout.addEventListener("change", (event) => {
      if (event.matches && dialog.open) {
        sectionNavigationPending = true;
        dialog.close();
      }
    });

    for (const link of dialog.querySelectorAll('a[href^="#"]')) {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        const targetId = decodeHash(href);
        const target = document.getElementById(targetId);
        if (!target) return;

        event.preventDefault();
        sectionNavigationPending = true;
        dialog.close();
        window.requestAnimationFrame(() => {
          window.history.pushState(null, "", href);
          target.scrollIntoView({
            behavior: reducedMotion.matches ? "auto" : "smooth",
            block: "start",
          });
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          target.addEventListener(
            "blur",
            () => {
              target.removeAttribute("tabindex");
            },
            { once: true },
          );
          setActiveSection(targetId);
        });
      });
    }
  }

  if (headings.length === 0 || links.length === 0) return;

  const updateFromViewport = () => {
    const referenceLine = window.innerHeight * 0.2;
    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= referenceLine) {
        active = heading;
      } else {
        break;
      }
    }
    setActiveSection(active.id);
  };

  let updateQueued = false;
  const scheduleViewportUpdate = () => {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(() => {
      updateQueued = false;
      updateFromViewport();
    });
  };

  setActiveSection(
    decodeHash(window.location.hash) || headings[0].id,
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(scheduleViewportUpdate, {
      rootMargin: "-20% 0px -79.5% 0px",
      threshold: [0],
    });
    for (const heading of headings) observer.observe(heading);
  }

  window.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
  window.addEventListener("resize", scheduleViewportUpdate);

  window.addEventListener("hashchange", () => {
    const id = decodeHash(window.location.hash);
    if (id) setActiveSection(id);
  });
})();
