(() => {
  "use strict";

  const loader = document.currentScript;
  if (!(loader instanceof HTMLScriptElement)) return;

  const expectedHostname = (loader.dataset.cloudflareHostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/u, "");
  const currentHostname = window.location.hostname
    .trim()
    .toLowerCase()
    .replace(/\.$/u, "");
  const token = (loader.dataset.cloudflareToken || "").trim();
  const hostnameMatches = currentHostname === expectedHostname
    || currentHostname.endsWith(`.${expectedHostname}`);

  if (
    !expectedHostname
    || !hostnameMatches
    || !/^[a-f0-9]{32}$/u.test(token)
    || document.querySelector("script[data-cf-beacon]")
  ) {
    return;
  }

  const beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.dataset.cfBeacon = JSON.stringify({ token });
  loader.after(beacon);
})();
