(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const HISTORY_VERSION = 1;
  const HISTORY_LIMIT = 100;
  const ROLLING_WINDOW = 5;
  const VIEWBOX = Object.freeze({ width: 512, height: 288 });
  const PLOT = Object.freeze({ left: 58, right: 18, top: 20, bottom: 44 });
  const CONFIG = Object.freeze({
    "ten-second": Object.freeze({
      key: "yiyuiii.toy.ten-second.v1",
      rawMinimum: 0,
      rawMaximum: 600_000,
      validMinimum: 1_000,
      validMaximum: 120_000,
      target: 10_000,
    }),
    "reaction-time": Object.freeze({
      key: "yiyuiii.toy.reaction-time.v1",
      rawMinimum: 0,
      rawMaximum: 60_000,
      validMinimum: 100,
      validMaximum: 3_000,
      target: 0,
    }),
  });

  const interpolate = (template, values) => Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    String(template || ""),
  );

  const configFor = (kind) => {
    const config = CONFIG[kind];
    if (!config) throw new Error(`unknown timing challenge: ${kind}`);
    return config;
  };

  const emptyHistory = () => Object.freeze({
    version: HISTORY_VERSION,
    samples: Object.freeze([]),
    completedTotal: 0,
    falseStarts: 0,
  });

  const boundedCounter = (value) => (
    Number.isSafeInteger(value) && value >= 0 ? value : 0
  );

  const normalizeHistory = (kind, value) => {
    const config = configFor(kind);
    if (!value || typeof value !== "object" || value.version !== HISTORY_VERSION) {
      return emptyHistory();
    }
    const candidates = Array.isArray(value.samples) ? value.samples : [];
    const samples = candidates
      .filter((sample) => Number.isFinite(sample))
      .map((sample) => Math.round(sample))
      .filter((sample) => sample >= config.rawMinimum && sample <= config.rawMaximum)
      .slice(-HISTORY_LIMIT);
    const completedTotal = Math.max(boundedCounter(value.completedTotal), samples.length);
    const falseStarts = kind === "reaction-time" ? boundedCounter(value.falseStarts) : 0;
    return Object.freeze({
      version: HISTORY_VERSION,
      samples: Object.freeze(samples),
      completedTotal,
      falseStarts,
    });
  };

  const appendSample = (kind, history, milliseconds) => {
    const config = configFor(kind);
    const current = normalizeHistory(kind, history);
    if (!Number.isFinite(milliseconds)) return current;
    const rounded = Math.round(milliseconds);
    if (rounded < config.rawMinimum || rounded > config.rawMaximum) return current;
    return Object.freeze({
      version: HISTORY_VERSION,
      samples: Object.freeze([...current.samples, rounded].slice(-HISTORY_LIMIT)),
      completedTotal: Math.min(Number.MAX_SAFE_INTEGER, current.completedTotal + 1),
      falseStarts: current.falseStarts,
    });
  };

  const recordFalseStart = (history) => {
    const current = normalizeHistory("reaction-time", history);
    return Object.freeze({
      ...current,
      falseStarts: Math.min(Number.MAX_SAFE_INTEGER, current.falseStarts + 1),
    });
  };

  const percentile = (values, proportion) => {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
    if (sorted.length === 0) return null;
    const bounded = Math.min(1, Math.max(0, Number(proportion)));
    const position = (sorted.length - 1) * bounded;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    if (lowerIndex === upperIndex) return sorted[lowerIndex];
    const fraction = position - lowerIndex;
    return sorted[lowerIndex] + ((sorted[upperIndex] - sorted[lowerIndex]) * fraction);
  };

  const median = (values) => percentile(values, 0.5);

  const validSample = (kind, value) => {
    const config = configFor(kind);
    return Number.isFinite(value)
      && value >= config.validMinimum
      && value <= config.validMaximum;
  };

  const rollingMedian = (kind, samples, transform = (value) => value) => {
    const recent = [];
    return samples.map((sample) => {
      if (!validSample(kind, sample)) return null;
      recent.push(transform(sample));
      if (recent.length > ROLLING_WINDOW) recent.shift();
      return recent.length === ROLLING_WINDOW ? median(recent) : null;
    });
  };

  const summarizeTenSecond = (history) => {
    const current = normalizeHistory("ten-second", history);
    const valid = current.samples.filter((sample) => validSample("ten-second", sample));
    const signedErrors = valid.map((sample) => sample - CONFIG["ten-second"].target);
    const absoluteErrors = signedErrors.map(Math.abs);
    const rolling = rollingMedian(
      "ten-second",
      current.samples,
      (sample) => sample - CONFIG["ten-second"].target,
    );
    return Object.freeze({
      retainedCount: current.samples.length,
      completedTotal: current.completedTotal,
      validCount: valid.length,
      latest: current.samples.at(-1) ?? null,
      best: absoluteErrors.length ? Math.min(...absoluteErrors) : null,
      typical: median(absoluteErrors),
      tendency: median(signedErrors),
      recentMedian: rolling.filter(Number.isFinite).at(-1) ?? null,
      rolling: Object.freeze(rolling),
    });
  };

  const summarizeReaction = (history) => {
    const current = normalizeHistory("reaction-time", history);
    const valid = current.samples.filter((sample) => validSample("reaction-time", sample));
    const rolling = rollingMedian("reaction-time", current.samples);
    const attempts = current.completedTotal + current.falseStarts;
    return Object.freeze({
      retainedCount: current.samples.length,
      completedTotal: current.completedTotal,
      validCount: valid.length,
      latest: current.samples.at(-1) ?? null,
      best: valid.length ? Math.min(...valid) : null,
      typical: median(valid),
      recentMedian: rolling.filter(Number.isFinite).at(-1) ?? null,
      falseStarts: current.falseStarts,
      falseStartRate: attempts ? current.falseStarts / attempts : 0,
      rolling: Object.freeze(rolling),
    });
  };

  const niceCeiling = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const normalized = value / power;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * power;
  };

  const buildChartSeries = (kind, history) => {
    const current = normalizeHistory(kind, history);
    const config = configFor(kind);
    const transformed = current.samples.map((sample) => (
      kind === "ten-second" ? sample - config.target : sample
    ));
    const validValues = current.samples
      .filter((sample) => validSample(kind, sample))
      .map((sample) => (kind === "ten-second" ? sample - config.target : sample));
    const percentileValue = percentile(validValues.map(Math.abs), 0.9) || 0;
    let minimum;
    let maximum;
    if (kind === "ten-second") {
      const extent = Math.min(10_000, Math.max(500, niceCeiling(percentileValue * 1.15)));
      minimum = -extent;
      maximum = extent;
    } else {
      minimum = 0;
      maximum = Math.min(3_000, Math.max(500, niceCeiling(percentileValue * 1.15)));
    }
    const rolling = rollingMedian(
      kind,
      current.samples,
      kind === "ten-second" ? (sample) => sample - config.target : (sample) => sample,
    );
    return Object.freeze({
      minimum,
      maximum,
      baseline: kind === "ten-second" ? 0 : null,
      points: Object.freeze(transformed.map((value, index) => Object.freeze({
        index,
        value,
        valid: validSample(kind, current.samples[index]),
        clipped: Math.min(maximum, Math.max(minimum, value)),
        outside: value < minimum || value > maximum,
      }))),
      rolling: Object.freeze(rolling),
    });
  };

  const createStore = (kind, storage) => {
    const config = configFor(kind);
    let persistent = Boolean(storage);
    let history = emptyHistory();

    if (persistent) {
      try {
        const serialized = storage.getItem(config.key);
        if (serialized) {
          try {
            history = normalizeHistory(kind, JSON.parse(serialized));
          } catch (_error) {
            history = emptyHistory();
          }
        }
      } catch (_error) {
        persistent = false;
      }
    }

    const persist = () => {
      if (!persistent) return false;
      try {
        storage.setItem(config.key, JSON.stringify(history));
        return true;
      } catch (_error) {
        persistent = false;
        return false;
      }
    };

    return Object.freeze({
      append(milliseconds) {
        history = appendSample(kind, history, milliseconds);
        persist();
        return history;
      },
      clear() {
        history = emptyHistory();
        if (!persistent) return false;
        try {
          storage.removeItem(config.key);
          return true;
        } catch (_error) {
          persistent = false;
          return false;
        }
      },
      falseStart() {
        if (kind !== "reaction-time") return history;
        history = recordFalseStart(history);
        persist();
        return history;
      },
      getHistory() {
        return history;
      },
      isPersistent() {
        return persistent;
      },
      replace(value) {
        history = normalizeHistory(kind, value);
        return history;
      },
    });
  };

  const clearStatusName = (wasPersistent, removedPersistent) => (
    wasPersistent && !removedPersistent ? "clearFailed" : "cleared"
  );

  const svgNode = (name, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [attribute, value] of Object.entries(attributes)) {
      node.setAttribute(attribute, String(value));
    }
    return node;
  };

  const formatSeconds = (milliseconds, copy, signed = false) => {
    if (!Number.isFinite(milliseconds)) return copy.notAvailable;
    const absolute = Math.abs(milliseconds) / 1000;
    if (!signed) return interpolate(copy.secondsValue, { value: absolute.toFixed(2) });
    if (Math.abs(milliseconds) < 10) return copy.exactValue;
    return interpolate(copy.signedSecondsValue, {
      direction: milliseconds < 0 ? copy.early : copy.late,
      value: absolute.toFixed(2),
    });
  };

  const formatMilliseconds = (milliseconds, copy) => (
    Number.isFinite(milliseconds)
      ? interpolate(copy.millisecondsValue, { value: Math.round(milliseconds) })
      : copy.notAvailable
  );

  const formatSample = (kind, sample, copy) => {
    if (kind === "ten-second") {
      return interpolate(copy.tenSampleValue, {
        elapsed: (sample / 1000).toFixed(2),
        error: formatSeconds(sample - CONFIG["ten-second"].target, copy, true),
      });
    }
    return formatMilliseconds(sample, copy);
  };

  const statValues = (kind, summary, copy) => {
    if (kind === "ten-second") {
      return {
        retained: interpolate(copy.validRetainedValue, {
          valid: summary.validCount,
          retained: summary.retainedCount,
        }),
        completed: String(summary.completedTotal),
        best: formatSeconds(summary.best, copy),
        typical: formatSeconds(summary.typical, copy),
        tendency: formatSeconds(summary.tendency, copy, true),
        recent: formatSeconds(summary.recentMedian, copy, true),
      };
    }
    return {
      retained: interpolate(copy.validRetainedValue, {
        valid: summary.validCount,
        retained: summary.retainedCount,
      }),
      completed: String(summary.completedTotal),
      best: formatMilliseconds(summary.best, copy),
      typical: formatMilliseconds(summary.typical, copy),
      recent: formatMilliseconds(summary.recentMedian, copy),
      falseStarts: interpolate(copy.falseStartsValue, {
        count: summary.falseStarts,
        rate: (summary.falseStartRate * 100).toFixed(1),
      }),
    };
  };

  const chartDescription = (kind, summary, copy) => {
    if (kind === "ten-second") {
      return interpolate(copy.chartDescription, {
        count: summary.retainedCount,
        latest: summary.latest === null
          ? copy.notAvailable
          : formatSeconds(summary.latest - CONFIG["ten-second"].target, copy, true),
        trend: formatSeconds(summary.recentMedian, copy, true),
      });
    }
    return interpolate(copy.chartDescription, {
      count: summary.retainedCount,
      latest: formatMilliseconds(summary.latest, copy),
      trend: formatMilliseconds(summary.recentMedian, copy),
    });
  };

  const renderChart = (container, kind, history, summary, copy) => {
    container.replaceChildren();
    const series = buildChartSeries(kind, history);
    if (series.points.length === 0) return;

    const svg = svgNode("svg", {
      class: "toy-history-chart",
      viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
      role: "img",
      focusable: "false",
      preserveAspectRatio: "xMidYMid meet",
    });
    const titleId = `${kind}-history-chart-title`;
    const descriptionId = `${kind}-history-chart-description`;
    svg.setAttribute("aria-labelledby", `${titleId} ${descriptionId}`);
    const title = svgNode("title", { id: titleId });
    title.textContent = copy.chartTitle;
    const description = svgNode("desc", { id: descriptionId });
    description.textContent = chartDescription(kind, summary, copy);
    svg.append(title, description);

    const plotWidth = VIEWBOX.width - PLOT.left - PLOT.right;
    const plotHeight = VIEWBOX.height - PLOT.top - PLOT.bottom;
    const xAt = (index) => PLOT.left + (
      series.points.length === 1 ? plotWidth / 2 : (index / (series.points.length - 1)) * plotWidth
    );
    const yAt = (value) => PLOT.top + (
      ((series.maximum - value) / (series.maximum - series.minimum)) * plotHeight
    );

    const ticks = kind === "ten-second"
      ? [series.maximum, 0, series.minimum]
      : [series.maximum, series.maximum / 2, 0];
    for (const tick of ticks) {
      const y = yAt(tick);
      const line = svgNode("line", {
        class: tick === 0 && kind === "ten-second"
          ? "toy-history-chart__baseline"
          : "toy-history-chart__grid",
        x1: PLOT.left,
        x2: VIEWBOX.width - PLOT.right,
        y1: y,
        y2: y,
      });
      const label = svgNode("text", {
        class: "toy-history-chart__axis-label",
        x: PLOT.left - 8,
        y: y + 4,
        "text-anchor": "end",
      });
      label.textContent = kind === "ten-second"
        ? `${tick > 0 ? "+" : ""}${(tick / 1000).toFixed(tick % 1000 ? 1 : 0)}s`
        : `${Math.round(tick)}ms`;
      svg.append(line, label);
    }

    const older = svgNode("text", {
      class: "toy-history-chart__axis-label",
      x: PLOT.left,
      y: VIEWBOX.height - 12,
      "text-anchor": "start",
    });
    older.textContent = copy.older;
    const recent = svgNode("text", {
      class: "toy-history-chart__axis-label",
      x: VIEWBOX.width - PLOT.right,
      y: VIEWBOX.height - 12,
      "text-anchor": "end",
    });
    recent.textContent = copy.newer;
    svg.append(older, recent);

    for (const point of series.points) {
      const x = xAt(point.index);
      const y = yAt(point.clipped);
      let marker;
      if (point.outside) {
        const direction = point.value > series.maximum ? 1 : -1;
        marker = svgNode("path", {
          class: "toy-history-chart__point toy-history-chart__point--excluded",
          d: `M ${x} ${y} l -5 ${direction * 8} h 10 Z`,
          "data-history-point": point.index,
        });
      } else {
        marker = svgNode("circle", {
          class: `toy-history-chart__point${point.valid ? "" : " toy-history-chart__point--excluded"}`,
          cx: x,
          cy: y,
          r: point.valid ? 3.4 : 4.2,
          "data-history-point": point.index,
        });
      }
      svg.append(marker);
    }

    const pathParts = [];
    series.rolling.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      const clipped = Math.min(series.maximum, Math.max(series.minimum, value));
      pathParts.push(`${pathParts.length ? "L" : "M"} ${xAt(index)} ${yAt(clipped)}`);
    });
    if (pathParts.length) {
      svg.append(svgNode("path", {
        class: "toy-history-chart__trend",
        d: pathParts.length === 1 ? `${pathParts[0]} l 0.01 0` : pathParts.join(" "),
        fill: "none",
        "stroke-linecap": "round",
      }));
    }
    container.append(svg);
  };

  const createHistoryController = ({ root, kind, copy }) => {
    const historyRoot = root.querySelector("[data-challenge-history]");
    const emptyNode = root.querySelector("[data-history-empty]");
    const statsNode = root.querySelector("[data-history-stats]");
    const chartNode = root.querySelector("[data-history-chart]");
    const recordsNode = root.querySelector("[data-history-records]");
    const tableBody = root.querySelector("[data-history-table-body]");
    const persistenceNode = root.querySelector("[data-history-persistence]");
    const clearButton = root.querySelector("[data-history-clear]");
    const confirmation = root.querySelector("[data-history-confirmation]");
    const confirmButton = root.querySelector("[data-history-confirm-clear]");
    const cancelButton = root.querySelector("[data-history-cancel-clear]");
    const clearStatus = root.querySelector("[data-history-clear-status]");

    let storage = null;
    try {
      storage = globalScope.localStorage;
    } catch (_error) {
      storage = null;
    }
    const store = createStore(kind, storage);

    const render = () => {
      const history = store.getHistory();
      const summary = kind === "ten-second"
        ? summarizeTenSecond(history)
        : summarizeReaction(history);
      if (historyRoot) historyRoot.hidden = false;
      if (persistenceNode) {
        const memoryOnly = !store.isPersistent();
        persistenceNode.hidden = !memoryOnly;
        persistenceNode.textContent = memoryOnly ? copy.memoryOnly : "";
      }
      const hasHistory = history.samples.length > 0 || history.falseStarts > 0;
      if (emptyNode) emptyNode.hidden = hasHistory;
      if (statsNode) statsNode.hidden = !hasHistory;
      if (recordsNode) recordsNode.hidden = history.samples.length === 0;
      if (clearButton) clearButton.hidden = !hasHistory;
      if (chartNode) {
        chartNode.hidden = history.samples.length === 0;
        if (history.samples.length) renderChart(chartNode, kind, history, summary, copy);
        else chartNode.replaceChildren();
      }

      const values = statValues(kind, summary, copy);
      for (const output of root.querySelectorAll("[data-history-value]")) {
        const name = output.dataset.historyValue;
        output.textContent = values[name] ?? copy.notAvailable;
      }

      if (tableBody) {
        const fragment = document.createDocumentFragment();
        history.samples.forEach((sample, index) => {
          const row = document.createElement("tr");
          const sequence = document.createElement("th");
          sequence.scope = "row";
          sequence.textContent = String(history.completedTotal - history.samples.length + index + 1);
          const value = document.createElement("td");
          value.textContent = formatSample(kind, sample, copy);
          const inclusion = document.createElement("td");
          inclusion.textContent = validSample(kind, sample) ? copy.included : copy.excluded;
          row.append(sequence, value, inclusion);
          fragment.prepend(row);
        });
        tableBody.replaceChildren(fragment);
      }
    };

    const closeConfirmation = (returnFocus = false) => {
      if (confirmation) confirmation.hidden = true;
      if (clearButton) clearButton.hidden = false;
      if (returnFocus) clearButton?.focus();
    };

    clearButton?.addEventListener("click", () => {
      clearButton.hidden = true;
      if (confirmation) confirmation.hidden = false;
      confirmButton?.focus();
    });
    cancelButton?.addEventListener("click", () => closeConfirmation(true));
    confirmation?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeConfirmation(true);
    });
    confirmButton?.addEventListener("click", () => {
      const wasPersistent = store.isPersistent();
      const removedPersistent = store.clear();
      if (clearStatus) {
        clearStatus.textContent = copy[clearStatusName(wasPersistent, removedPersistent)];
      }
      closeConfirmation();
      render();
      root.querySelector("[data-ten-primary], [data-reaction-primary]")?.focus();
    });

    if (typeof globalScope.addEventListener === "function") {
      globalScope.addEventListener("storage", (event) => {
        if (event.key !== CONFIG[kind].key) return;
        let value = null;
        try {
          value = event.newValue ? JSON.parse(event.newValue) : null;
        } catch (_error) {
          value = null;
        }
        store.replace(value);
        closeConfirmation();
        if (clearStatus) clearStatus.textContent = "";
        render();
      });
    }

    render();
    return Object.freeze({
      append(milliseconds) {
        closeConfirmation();
        if (clearStatus) clearStatus.textContent = "";
        store.append(milliseconds);
        render();
      },
      falseStart() {
        closeConfirmation();
        if (clearStatus) clearStatus.textContent = "";
        store.falseStart();
        render();
      },
      refresh: render,
    });
  };

  globalScope.yiyuiiiToyChallengeHistory = Object.freeze({
    CONFIG,
    HISTORY_LIMIT,
    HISTORY_VERSION,
    ROLLING_WINDOW,
    appendSample,
    buildChartSeries,
    clearStatusName,
    createHistoryController,
    createStore,
    emptyHistory,
    median,
    niceCeiling,
    normalizeHistory,
    percentile,
    recordFalseStart,
    rollingMedian,
    summarizeReaction,
    summarizeTenSecond,
    validSample,
  });
})();
