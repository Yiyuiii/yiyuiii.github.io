(() => {
  "use strict";

  const randomIndex = (length) => {
    const uint32Range = 0x1_0000_0000;
    if (
      !Number.isSafeInteger(length)
      || length < 1
      || length > uint32Range
      || !window.crypto?.getRandomValues
    ) return null;

    const unbiasedLimit = uint32Range - (uint32Range % length);
    const sample = new Uint32Array(1);
    try {
      do {
        window.crypto.getRandomValues(sample);
      } while (sample[0] >= unbiasedLimit);
    } catch (_error) {
      return null;
    }
    return sample[0] % length;
  };

  const page = document.querySelector("[data-home-page]");
  if (!page) return;

  const query = new URLSearchParams(window.location.search);
  if (query.has("tag")) {
    const target = `${page.dataset.writingUrl}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
    return;
  }

  const rotation = document.querySelector("[data-home-rotation]");
  const data = document.querySelector("#home-rotation-data");
  const recentData = document.querySelector("#home-recent-ids");
  const typeData = document.querySelector("#home-type-labels");
  if (!rotation || !data || !recentData || !typeData) return;

  let candidates;
  let recentIds;
  let typeLabels;
  try {
    candidates = JSON.parse(data.textContent || "[]");
    recentIds = new Set(JSON.parse(recentData.textContent || "[]"));
    typeLabels = JSON.parse(typeData.textContent || "{}");
  } catch (_error) {
    return;
  }

  candidates = candidates.filter(
    (item) => item && item.id && !recentIds.has(item.id),
  );
  if (!candidates.length) return;

  const card = rotation.querySelector("[data-home-feed-item]");
  if (!card) return;

  const renderRandomCandidate = () => {
    const selectedIndex = randomIndex(candidates.length);
    if (selectedIndex === null) return;
    const selected = candidates[selectedIndex];

    document.querySelector("[data-rotation-live-title]")?.removeAttribute("hidden");
    document.querySelector("[data-rotation-live-note]")?.removeAttribute("hidden");
    document.querySelector("[data-rotation-fallback-title]")?.setAttribute("hidden", "");

    card.dataset.stableId = selected.id;
    card.querySelector("[data-home-kind]").textContent = typeLabels[selected.kind] || selected.kind;
    const time = card.querySelector("[data-home-date]");
    time.dateTime = selected.first_public_date;
    time.textContent = selected.first_public_precision === "year"
      ? selected.first_public_date
      : selected.first_public_date.replaceAll("-", rotation.dataset.dateFormat.includes("%Y.") ? "." : "-");
    card.querySelector("[data-home-title]").textContent = selected.title;
    card.querySelector("[data-home-summary]").textContent = selected.summary;

    const link = card.querySelector("[data-home-link]");
    link.href = selected.url;
    link.querySelector("[data-home-external]")?.remove();
    if (selected.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const external = document.createElement("span");
      external.className = "sr-only";
      external.dataset.homeExternal = "";
      external.textContent = ` — ${rotation.dataset.externalLabel}`;
      link.append(external);
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }

    const grid = card.querySelector("[data-home-grid]");
    card.querySelector("[data-home-thumbnail-link]")?.remove();
    grid.classList.toggle("home-feed-item__grid--text-only", !selected.thumbnail);
    if (selected.thumbnail) {
      const base = selected.thumbnail.replace(/\.webp$/u, "");
      const thumbnail = document.createElement("a");
      thumbnail.className = "entry-thumbnail home-feed-item__thumbnail";
      thumbnail.dataset.homeThumbnailLink = "";
      thumbnail.href = selected.url;
      thumbnail.tabIndex = -1;
      thumbnail.setAttribute("aria-hidden", "true");
      const image = document.createElement("img");
      image.src = `${base}-index-v1-160.webp`;
      image.srcset = `${base}-index-v1-160.webp 160w, ${base}-index-v1-320.webp 320w`;
      image.sizes = "(max-width: 380px) 88px, (max-width: 640px) 109px, 134px";
      image.width = 160;
      image.height = 160;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      thumbnail.append(image);
      grid.append(thumbnail);
    }
  };

  renderRandomCandidate();
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) renderRandomCandidate();
  });
})();
