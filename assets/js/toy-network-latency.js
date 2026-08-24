(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const logic = globalScope.yiyuiiiNetworkLatencyLogic;
  if (!logic) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const LIVE_SAMPLES = 60;
  const SAMPLE_INTERVAL = 1000;
  const PROBE_TIMEOUT = 8000;
  const VISITOR_TIMEOUT = 4500;
  let sequence = 0;

  const interpolate = (template, values) => String(template).replace(
    /\{([a-z0-9_]+)\}/giu,
    (_match, key) => String(values[key] ?? ""),
  );
  const rounded = (value) => Number.isFinite(value) ? Math.round(value) : null;
  const compactText = (values) => [...new Set(values.filter(Boolean).map(String))].join(" · ");

  for (const root of document.querySelectorAll("[data-network-latency]")) {
    const copyNode = root.querySelector("[data-network-latency-copy]");
    let copy;
    try {
      copy = JSON.parse(copyNode?.textContent || "{}");
    } catch (_error) {
      continue;
    }

    const expectedIds = logic.NODE_DEFINITIONS.map((node) => node.id);
    const liveRows = new Map(
      [...root.querySelectorAll("[data-latency-live-row]")]
        .map((row) => [row.dataset.latencyLiveRow, row]),
    );
    const chartLines = new Map(
      [...root.querySelectorAll("[data-latency-chart-line]")]
        .map((path) => [path.dataset.latencyChartLine, path]),
    );
    if (
      liveRows.size !== expectedIds.length
      || chartLines.size !== expectedIds.length
      || expectedIds.some((id) => !liveRows.has(id) || !chartLines.has(id))
    ) continue;

    const testButton = root.querySelector("[data-latency-test-start]");
    const stopButton = root.querySelector("[data-latency-stop]");
    const status = root.querySelector("[data-latency-status]");
    const chart = root.querySelector("[data-latency-chart]");
    const chartGrid = root.querySelector("[data-latency-chart-grid]");
    const samplesById = new Map(expectedIds.map((id) => [id, []]));
    let activeRun = null;
    let cloudflareFallback = null;
    let visitorResolved = false;
    let visitorSourcesExhausted = false;

    const setRunning = (running) => {
      if (testButton) testButton.disabled = running;
      if (stopButton) stopButton.hidden = !running;
      root.dataset.latencyRunning = running ? "true" : "false";
    };

    const finishRun = (run) => {
      if (activeRun !== run) return;
      activeRun = null;
      setRunning(false);
    };

    const cancelRun = (announce = true) => {
      if (!activeRun) return;
      const run = activeRun;
      run.cancelled = true;
      for (const controller of run.controllers) controller.abort();
      activeRun = null;
      setRunning(false);
      if (announce && status) status.textContent = copy.stopped;
    };

    const createRun = () => {
      cancelRun(false);
      const run = {
        cancelled: false,
        completedNodes: 0,
        completedSamples: 0,
        controllers: new Set(),
        lastStatusUpdate: 0,
      };
      activeRun = run;
      setRunning(true);
      return run;
    };

    const request = async (url, init, run, parseJson = false, timeoutMs = PROBE_TIMEOUT) => {
      const controller = new AbortController();
      run.controllers.add(controller);
      const timeout = globalScope.setTimeout(() => controller.abort(), timeoutMs);
      const started = globalScope.performance.now();
      try {
        const response = await globalScope.fetch(url, { ...init, signal: controller.signal });
        if (response.type !== "opaque" && !response.ok) throw new Error(`HTTP ${response.status}`);
        const elapsed = globalScope.performance.now() - started;
        return parseJson
          ? { data: await response.json(), elapsed, headers: response.headers }
          : { elapsed, headers: response.headers };
      } finally {
        globalScope.clearTimeout(timeout);
        run.controllers.delete(controller);
      }
    };

    const probe = async (nodeId, run) => {
      if (run.cancelled) return null;
      sequence += 1;
      const probeRequest = logic.buildProbeRequest(nodeId, sequence);
      try {
        const result = await request(probeRequest.url, probeRequest.init, run);
        if (nodeId === "cloudflare-nearest") applyCloudflareVisitor(result.headers);
        return Math.max(0, result.elapsed);
      } catch (_error) {
        return null;
      }
    };

    const setVisitorField = (name, value) => {
      const output = root.querySelector(`[data-visitor-field="${name}"]`);
      if (output) output.textContent = value || copy.unavailable;
    };

    const setVisitorSource = (sourceId) => {
      const output = root.querySelector("[data-visitor-source]");
      if (output) output.textContent = copy.visitor_sources[sourceId] || copy.unavailable;
    };

    const browserConnection = () => {
      const connection = globalScope.navigator?.connection;
      if (!connection) return copy.browser_connection_unknown;
      const estimates = [];
      if (Number.isFinite(connection.rtt)) {
        estimates.push(interpolate(copy.browser_rtt_value, {
          rtt: interpolate(copy.ms_value, { value: Math.round(connection.rtt) }),
        }));
      }
      if (Number.isFinite(connection.downlink)) {
        estimates.push(interpolate(copy.browser_downlink_value, {
          downlink: `${connection.downlink} Mbps`,
        }));
      }
      return estimates.join(" · ") || copy.browser_connection_unknown;
    };

    const clearVisitor = () => {
      cloudflareFallback = null;
      visitorResolved = false;
      visitorSourcesExhausted = false;
      for (const name of Object.keys(copy.visitor_fields)) {
        setVisitorField(name, copy.metric_placeholder);
      }
      setVisitorField("browser_connection", browserConnection());
      const output = root.querySelector("[data-visitor-source]");
      if (output) output.textContent = copy.metric_placeholder;
    };

    const renderVisitor = (visitor, sourceId, complete = true) => {
      if (!visitor?.ip || (visitorResolved && !complete)) return;
      setVisitorField("ip", compactText([visitor.ip, visitor.ipVersion]));
      setVisitorField("network", visitor.network);
      setVisitorField("region", visitor.region);
      setVisitorSource(sourceId);
      if (complete) visitorResolved = true;
    };

    const applyCloudflareVisitor = (headers) => {
      if (!headers || visitorResolved) return;
      const ip = String(headers.get("cf-meta-ip") || "").trim();
      if (!ip) return;
      const asn = String(headers.get("cf-meta-asn") || headers.get("asn") || "").trim();
      cloudflareFallback = {
        ip,
        ipVersion: ip.includes(":") ? "IPv6" : "IPv4",
        network: asn ? `AS${asn.replace(/^AS/iu, "")}` : "",
        region: compactText([
          headers.get("cf-meta-city") || headers.get("city"),
          headers.get("cf-meta-country") || headers.get("country"),
        ]),
      };
      if (visitorSourcesExhausted) renderVisitor(cloudflareFallback, "cloudflare");
    };

    const loadVisitor = async (run) => {
      setVisitorField("browser_connection", browserConnection());
      for (const source of logic.VISITOR_SOURCES) {
        try {
          const result = await request(source.endpoint, {
            cache: "no-store",
            credentials: "omit",
            method: "GET",
            mode: "cors",
            referrerPolicy: "no-referrer",
          }, run, true, VISITOR_TIMEOUT);
          if (run.cancelled) return;
          const visitor = logic.normalizeVisitor(source.id, result.data);
          if (!visitor) throw new Error("invalid visitor response");
          renderVisitor(visitor, source.id);
          return;
        } catch (_error) {
          if (run.cancelled) return;
        }
      }
      visitorSourcesExhausted = true;
      if (!visitorResolved && cloudflareFallback) {
        renderVisitor(cloudflareFallback, "cloudflare");
      } else if (!visitorResolved) {
        for (const name of Object.keys(copy.visitor_fields)) {
          setVisitorField(name, copy.unavailable);
        }
        setVisitorField("browser_connection", browserConnection());
        setVisitorSource("unavailable");
      }
    };

    const formatMs = (value) => Number.isFinite(value)
      ? interpolate(copy.ms_value, { value: rounded(value) })
      : copy.unavailable;

    const failureText = (summary) => interpolate(copy.failure_value, {
      failures: summary.failureCount,
      rate: (summary.failureRate * 100).toFixed(1),
      total: summary.totalCount,
    });

    const setLiveValue = (row, name, value) => {
      const output = row.querySelector(`[data-latency-live="${name}"]`);
      if (output) output.textContent = value;
    };

    const setIndicator = (row, name, value, thresholds) => {
      const indicator = row.querySelector(`[data-latency-indicator="${name}"]`);
      if (!indicator) return;
      let quality = "unavailable";
      if (Number.isFinite(value) && value >= 0) {
        if (value <= thresholds[0]) quality = "excellent";
        else if (value <= thresholds[1]) quality = "good";
        else if (value <= thresholds[2]) quality = "elevated";
        else quality = "unstable";
      }
      indicator.dataset.quality = quality;
    };

    const renderNode = (nodeId) => {
      const samples = samplesById.get(nodeId) || [];
      const row = liveRows.get(nodeId);
      if (!samples.length) {
        for (const name of Object.keys(copy.diagnostics)) {
          setLiveValue(row, name, copy.metric_placeholder);
        }
        setIndicator(row, "p50", null, [50, 100, 200]);
        setIndicator(row, "jitter", null, [8, 20, 40]);
        row.dataset.grade = "unavailable";
        const legend = root.querySelector(`[data-latency-legend-value="${nodeId}"]`);
        if (legend) legend.textContent = copy.not_measured;
        return;
      }
      const summary = logic.summarize(samples);
      const last = samples.at(-1);
      const latest = Number.isFinite(last) ? formatMs(last) : copy.request_failed;
      setLiveValue(row, "latest", latest);
      setLiveValue(row, "grade", copy.grades[summary.grade]);
      setLiveValue(row, "samples", interpolate(copy.sample_value, {
        success: summary.successCount,
        total: summary.totalCount,
      }));
      setLiveValue(row, "p50", formatMs(summary.p50));
      setLiveValue(row, "p95", formatMs(summary.p95));
      setLiveValue(row, "jitter", formatMs(summary.jitter));
      setLiveValue(row, "maximum", formatMs(summary.maximum));
      setLiveValue(row, "failures", failureText(summary));
      setLiveValue(row, "spikes", interpolate(copy.spike_value, summary));
      setIndicator(row, "p50", summary.p50, [50, 100, 200]);
      setIndicator(row, "jitter", summary.jitter, [8, 20, 40]);
      row.dataset.grade = summary.grade;
      const legend = root.querySelector(`[data-latency-legend-value="${nodeId}"]`);
      if (legend) legend.textContent = latest;
    };

    const svgNode = (name, attributes = {}) => {
      const node = document.createElementNS(SVG_NS, name);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
      return node;
    };

    const renderChart = () => {
      if (!chart || !chartGrid) return;
      const allSamples = [...samplesById.values()];
      const hasSamples = allSamples.some((samples) => samples.length > 0);
      chart.hidden = !hasSamples;
      if (!hasSamples) {
        chartGrid.replaceChildren();
        for (const path of chartLines.values()) path.setAttribute("d", "");
        return;
      }

      const valid = allSamples.flat().filter((value) => Number.isFinite(value) && value >= 0);
      const maximum = valid.length
        ? Math.max(100, Math.ceil(Math.max(...valid) / 50) * 50)
        : 100;
      const left = 54;
      const right = 624;
      const top = 16;
      const bottom = 188;
      const xAt = (index) => left + ((index / (LIVE_SAMPLES - 1)) * (right - left));
      const yAt = (value) => bottom - ((value / maximum) * (bottom - top));

      chartGrid.replaceChildren();
      for (const value of [maximum, maximum / 2, 0]) {
        const y = yAt(value);
        const line = svgNode("line", { x1: left, x2: right, y1: y, y2: y });
        const label = svgNode("text", { x: left - 8, y: y + 4, "text-anchor": "end" });
        label.textContent = `${Math.round(value)}ms`;
        chartGrid.append(line, label);
      }

      for (const id of expectedIds) {
        const samples = samplesById.get(id);
        const parts = [];
        let connected = false;
        samples.forEach((value, index) => {
          if (!Number.isFinite(value) || value < 0) {
            connected = false;
            return;
          }
          const x = xAt(index);
          const y = yAt(value);
          parts.push(`${connected ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`);
          if (!connected) parts.push(`L ${(x + 0.01).toFixed(2)} ${y.toFixed(2)}`);
          connected = true;
        });
        chartLines.get(id).setAttribute("d", parts.join(" "));
      }
    };

    const renderProgress = (run) => {
      if (!status || run.cancelled) return;
      const done = run.completedNodes === expectedIds.length;
      const now = globalScope.performance.now();
      if (!done && run.lastStatusUpdate && now - run.lastStatusUpdate < SAMPLE_INTERVAL) return;
      run.lastStatusUpdate = now;
      const values = {
        complete: run.completedNodes,
        current: run.completedSamples,
        nodes: expectedIds.length,
        total: expectedIds.length * LIVE_SAMPLES,
      };
      status.textContent = interpolate(
        done ? copy.test_done : copy.test_progress,
        values,
      );
    };

    const wait = (milliseconds) => new Promise((resolve) => globalScope.setTimeout(resolve, milliseconds));

    const runNode = async (nodeId, run) => {
      await probe(nodeId, run);
      if (run.cancelled) return;
      await wait(SAMPLE_INTERVAL);
      for (let index = 0; index < LIVE_SAMPLES && !run.cancelled; index += 1) {
        const started = globalScope.performance.now();
        const value = await probe(nodeId, run);
        if (run.cancelled) return;
        samplesById.get(nodeId).push(value);
        run.completedSamples += 1;
        renderNode(nodeId);
        renderChart();
        renderProgress(run);
        const remaining = SAMPLE_INTERVAL - (globalScope.performance.now() - started);
        if (remaining > 0 && index < LIVE_SAMPLES - 1) await wait(remaining);
      }
      if (run.cancelled) return;
      run.completedNodes += 1;
      renderProgress(run);
    };

    testButton?.addEventListener("click", async () => {
      const run = createRun();
      clearVisitor();
      for (const id of expectedIds) {
        samplesById.set(id, []);
        renderNode(id);
      }
      renderChart();
      if (status) status.textContent = copy.test_warming;

      const nodeTasks = expectedIds.map((id) => runNode(id, run));
      await Promise.all([loadVisitor(run), ...nodeTasks]);
      if (!run.cancelled) renderProgress(run);
      finishRun(run);
    });

    stopButton?.addEventListener("click", () => cancelRun(true));
    root.closest("details")?.addEventListener("toggle", (event) => {
      if (!event.currentTarget.open) cancelRun(true);
    });
    globalScope.addEventListener("pagehide", () => cancelRun(false));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") cancelRun(true);
    });
  }
})();
