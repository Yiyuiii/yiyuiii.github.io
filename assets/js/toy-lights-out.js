(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const SIZES = Object.freeze([3, 4]);
  const BAND_KEYS = Object.freeze(["short", "medium", "long"]);
  const EXPECTED_DISTRIBUTIONS = Object.freeze({
    3: Object.freeze([1, 9, 36, 84, 126, 126, 84, 36, 9, 1]),
    4: Object.freeze([1, 16, 120, 560, 1387, 1440, 540, 32]),
  });
  const boardPoolsCache = new Map();

  const popcount = (rawValue) => {
    let value = rawValue >>> 0;
    let count = 0;
    while (value !== 0) {
      value &= value - 1;
      count += 1;
    }
    return count;
  };

  const validateSize = (size) => {
    if (!SIZES.includes(size)) throw new RangeError("invalid board size");
    return size;
  };

  const toggleMasks = (size) => {
    validateSize(size);
    const masks = [];
    const directions = Object.freeze([[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        let mask = 0;
        for (const [rowDelta, columnDelta] of directions) {
          const nextRow = row + rowDelta;
          const nextColumn = column + columnDelta;
          if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) continue;
          mask ^= 1 << (nextRow * size + nextColumn);
        }
        masks.push(mask);
      }
    }
    return Object.freeze(masks);
  };

  const boardFromPressMask = (pressMask, masks) => {
    let board = 0;
    for (let index = 0; index < masks.length; index += 1) {
      if ((pressMask & (1 << index)) !== 0) board ^= masks[index];
    }
    return board;
  };

  const buildBoardCatalog = (size) => {
    validateSize(size);
    const masks = toggleMasks(size);
    const cellCount = size * size;
    const byBoard = new Map();
    for (let pressMask = 0; pressMask < (1 << cellCount); pressMask += 1) {
      const board = boardFromPressMask(pressMask, masks);
      const distance = popcount(pressMask);
      const previous = byBoard.get(board);
      if (!previous || distance < previous.distance) {
        byBoard.set(board, Object.freeze({ board, distance, solutionMask: pressMask }));
      }
    }
    const catalog = [...byBoard.values()].sort((left, right) => left.board - right.board);
    const expectedStateCount = size === 3 ? 512 : 4096;
    if (catalog.length !== expectedStateCount) throw new Error("unexpected reachable-board count");

    const distribution = [];
    for (const entry of catalog) distribution[entry.distance] = (distribution[entry.distance] || 0) + 1;
    if (JSON.stringify(distribution) !== JSON.stringify(EXPECTED_DISTRIBUTIONS[size])) {
      throw new Error("unexpected board-distance distribution");
    }
    return Object.freeze(catalog);
  };

  const buildBoardPools = (size) => {
    const catalog = buildBoardCatalog(size);
    const pools = { short: [], medium: [], long: [] };
    for (const entry of catalog) {
      if (entry.distance >= 2 && entry.distance <= 3) pools.short.push(entry);
      else if (entry.distance >= 4 && entry.distance <= 5) pools.medium.push(entry);
      else if (entry.distance >= 6) pools.long.push(entry);
    }
    const expected = size === 3
      ? { short: 120, medium: 252, long: 130 }
      : { short: 680, medium: 2827, long: 572 };
    if (BAND_KEYS.some((key) => pools[key].length !== expected[key])) {
      throw new Error("unexpected board pool");
    }
    return Object.freeze({
      catalog,
      long: Object.freeze(pools.long),
      maxDistance: EXPECTED_DISTRIBUTIONS[size].length - 1,
      medium: Object.freeze(pools.medium),
      short: Object.freeze(pools.short),
    });
  };

  const getBoardPools = (size) => {
    validateSize(size);
    if (!boardPoolsCache.has(size)) boardPoolsCache.set(size, buildBoardPools(size));
    return boardPoolsCache.get(size);
  };

  const poolFor = (pools, band) => {
    if (!BAND_KEYS.includes(band) || !Array.isArray(pools[band])) {
      throw new RangeError("invalid minimum-move band");
    }
    return pools[band];
  };

  const chooseBoard = (randomApi, pool, currentBoard = null) => {
    if (!randomApi || typeof randomApi.uintBelow !== "function" || pool.length === 0) {
      throw new Error("random source unavailable");
    }
    const currentIndex = Number.isInteger(currentBoard)
      ? pool.findIndex((entry) => entry.board === currentBoard)
      : -1;
    let index;
    if (currentIndex >= 0 && pool.length > 1) {
      const draw = randomApi.uintBelow(pool.length - 1);
      index = draw >= currentIndex ? draw + 1 : draw;
    } else {
      index = randomApi.uintBelow(pool.length);
    }
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) {
      throw new RangeError("random source returned an invalid index");
    }
    return Object.freeze({ entry: pool[index], index });
  };

  const applyPress = (board, index, size) => {
    const masks = toggleMasks(size);
    if (!Number.isInteger(board) || board < 0 || board >= (1 << (size * size))) {
      throw new RangeError("invalid board");
    }
    if (!Number.isInteger(index) || index < 0 || index >= masks.length) {
      throw new RangeError("invalid cell index");
    }
    return board ^ masks[index];
  };

  const applySolution = (board, solutionMask, size) => {
    const masks = toggleMasks(size);
    if (!Number.isInteger(board) || board < 0 || board >= (1 << masks.length)) {
      throw new RangeError("invalid board");
    }
    if (!Number.isInteger(solutionMask) || solutionMask < 0 || solutionMask >= (1 << masks.length)) {
      throw new RangeError("invalid solution mask");
    }
    return board ^ boardFromPressMask(solutionMask, masks);
  };

  const createGameState = (entry, size) => {
    validateSize(size);
    if (!entry || !Number.isInteger(entry.board) || entry.board <= 0
      || !Number.isInteger(entry.distance) || entry.distance < 1
      || entry.distance !== popcount(entry.solutionMask)
      || applySolution(entry.board, entry.solutionMask, size) !== 0) {
      throw new RangeError("invalid board entry");
    }
    return Object.freeze({
      board: entry.board,
      history: Object.freeze([]),
      optimal: entry.distance,
      phase: "playing",
      size,
      solutionMask: entry.solutionMask,
      startBoard: entry.board,
    });
  };

  const pressCell = (state, index) => {
    if (state.phase !== "playing") return state;
    const board = applyPress(state.board, index, state.size);
    return Object.freeze({
      ...state,
      board,
      history: Object.freeze([...state.history, index]),
      phase: board === 0 ? "won" : "playing",
    });
  };

  const undoPress = (state) => {
    if (state.history.length === 0) return state.phase === "playing" ? state : Object.freeze({ ...state, phase: "playing" });
    const index = state.history[state.history.length - 1];
    return Object.freeze({
      ...state,
      board: applyPress(state.board, index, state.size),
      history: Object.freeze(state.history.slice(0, -1)),
      phase: "playing",
    });
  };

  const resetGameState = (state) => Object.freeze({
    ...state,
    board: state.startBoard,
    history: Object.freeze([]),
    phase: "playing",
  });

  const logic = Object.freeze({
    BAND_KEYS,
    EXPECTED_DISTRIBUTIONS,
    SIZES,
    applyPress,
    applySolution,
    buildBoardCatalog,
    buildBoardPools,
    chooseBoard,
    createGameState,
    getBoardPools,
    popcount,
    pressCell,
    resetGameState,
    toggleMasks,
    undoPress,
  });
  globalScope.yiyuiiiToyLightsOutLogic = logic;

  if (typeof document === "undefined") return;

  const interpolate = (template, values) => Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );

  const readCopy = (root) => {
    const node = root.querySelector("[data-lights-copy]");
    if (!node) throw new Error("missing lights-out copy");
    return JSON.parse(node.textContent || "null");
  };

  const disableGame = (root, copy) => {
    const interactive = root.querySelector("[data-lights-interactive]");
    const unavailable = root.querySelector("[data-lights-unavailable]");
    if (interactive) interactive.hidden = true;
    if (unavailable) {
      unavailable.textContent = copy?.unavailable || unavailable.textContent;
      unavailable.hidden = false;
    }
    root.dataset.state = "unavailable";
  };

  const activate = (root) => {
    if (root.dataset.lightsReady === "true" || root.dataset.state === "unavailable") return;
    let copy;
    try {
      copy = readCopy(root);
    } catch (_error) {
      disableGame(root, null);
      return;
    }

    const randomApi = globalScope.yiyuiiiToyRandom;
    const nodes = {
      apply: root.querySelector("[data-lights-settings-apply]"),
      band: root.querySelector("[data-lights-band]"),
      count: root.querySelector("[data-lights-pool-count]"),
      grid: root.querySelector("[data-lights-grid]"),
      interactive: root.querySelector("[data-lights-interactive]"),
      lit: root.querySelector("[data-lights-lit]"),
      longOption: root.querySelector("[data-lights-long-option]"),
      moves: root.querySelector("[data-lights-moves]"),
      newPuzzle: root.querySelector("[data-lights-new]"),
      reset: root.querySelector("[data-lights-reset]"),
      settings: root.querySelector("[data-lights-settings]"),
      settingsReset: root.querySelector("[data-lights-settings-reset]"),
      settingsStatus: root.querySelector("[data-lights-settings-status]"),
      size: root.querySelector("[data-lights-size]"),
      status: root.querySelector("[data-lights-status]"),
      summary: root.querySelector("[data-lights-settings-summary]"),
      undo: root.querySelector("[data-lights-undo]"),
    };
    if (!randomApi || typeof randomApi.uintBelow !== "function"
      || Object.values(nodes).some((node) => !node)) {
      disableGame(root, copy);
      return;
    }

    const formatter = new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 0 });
    const bandLabel = (band, maxDistance) => ({
      long: interpolate(copy.bandLong, { max: maxDistance }),
      medium: copy.bandMedium,
      short: copy.bandShort,
    })[band];
    let activeSize = 4;
    let activeBand = "medium";
    let currentBoard = null;
    let focusedIndex = 0;
    let state;

    const draftConfig = () => {
      const size = Number(nodes.size.value);
      const band = nodes.band.value;
      if (!SIZES.includes(size) || !BAND_KEYS.includes(band)) throw new RangeError("invalid settings");
      return { band, size };
    };

    const renderSettings = () => {
      const draft = draftConfig();
      const draftPools = getBoardPools(draft.size);
      nodes.longOption.textContent = bandLabel("long", draftPools.maxDistance);
      nodes.count.value = interpolate(copy.boardCount, {
        count: formatter.format(poolFor(draftPools, draft.band).length),
      });
      const activePools = getBoardPools(activeSize);
      nodes.summary.textContent = interpolate(copy.settingsSummary, {
        band: bandLabel(activeBand, activePools.maxDistance),
        count: formatter.format(poolFor(activePools, activeBand).length),
        size: `${activeSize} × ${activeSize}`,
      });
    };

    const focusCell = (index) => {
      focusedIndex = Math.max(0, Math.min(state.size * state.size - 1, index));
      for (const button of nodes.grid.querySelectorAll("[data-lights-cell]")) {
        button.tabIndex = Number(button.dataset.lightsCell) === focusedIndex ? 0 : -1;
      }
      const next = nodes.grid.querySelector(`[data-lights-cell="${focusedIndex}"]`);
      if (next && !next.disabled) next.focus();
    };

    const setMoveStatus = (index) => {
      const values = {
        column: index % state.size + 1,
        lit: popcount(state.board),
        moves: state.history.length,
        optimal: state.optimal,
        row: Math.floor(index / state.size) + 1,
      };
      nodes.status.textContent = interpolate(state.phase === "won" ? copy.won : copy.pressed, values);
    };

    const render = (restoreGridFocus = false) => {
      root.dataset.state = state.phase;
      nodes.grid.style.setProperty("--lights-size", String(state.size));
      nodes.grid.setAttribute("aria-label", interpolate(copy.gridLabel, {
        size: `${state.size} × ${state.size}`,
      }));
      nodes.grid.setAttribute("aria-rowcount", String(state.size));
      nodes.grid.setAttribute("aria-colcount", String(state.size));
      nodes.lit.textContent = formatter.format(popcount(state.board));
      nodes.moves.textContent = formatter.format(state.history.length);
      nodes.undo.disabled = state.history.length === 0;

      const fragment = document.createDocumentFragment();
      for (let row = 0; row < state.size; row += 1) {
        const rowNode = document.createElement("div");
        rowNode.className = "toy-lights-out__row";
        rowNode.setAttribute("role", "row");
        for (let column = 0; column < state.size; column += 1) {
          const index = row * state.size + column;
          const on = (state.board & (1 << index)) !== 0;
          const button = document.createElement("button");
          button.type = "button";
          button.className = `toy-lights-out__cell toy-lights-out__cell--${on ? "on" : "off"}`;
          button.dataset.lightsCell = String(index);
          button.disabled = state.phase === "won";
          button.tabIndex = index === focusedIndex ? 0 : -1;
          button.setAttribute("role", "gridcell");
          button.setAttribute("aria-rowindex", String(row + 1));
          button.setAttribute("aria-colindex", String(column + 1));
          button.setAttribute("aria-label", interpolate(copy.cellLabel, {
            column: column + 1,
            row: row + 1,
            state: on ? copy.lightOn : copy.lightOff,
          }));

          const symbol = document.createElement("span");
          symbol.className = "toy-lights-out__symbol";
          symbol.setAttribute("aria-hidden", "true");
          symbol.textContent = on ? "●" : "○";
          const text = document.createElement("span");
          text.className = "toy-lights-out__state";
          text.textContent = on ? copy.lightOn : copy.lightOff;
          button.append(symbol, text);
          button.addEventListener("click", () => {
            if (state.phase !== "playing") return;
            focusedIndex = index;
            state = pressCell(state, index);
            render(true);
            setMoveStatus(index);
          });
          button.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              button.click();
              return;
            }
            let next = index;
            if (event.key === "ArrowLeft") next = column === 0 ? index : index - 1;
            else if (event.key === "ArrowRight") next = column === state.size - 1 ? index : index + 1;
            else if (event.key === "ArrowUp") next = row === 0 ? index : index - state.size;
            else if (event.key === "ArrowDown") next = row === state.size - 1 ? index : index + state.size;
            else return;
            event.preventDefault();
            focusCell(next);
          });
          rowNode.append(button);
        }
        fragment.append(rowNode);
      }
      nodes.grid.replaceChildren(fragment);
      if (restoreGridFocus) {
        if (state.phase === "won") nodes.undo.focus();
        else focusCell(focusedIndex);
      }
    };

    const startPuzzle = (message, size = activeSize, band = activeBand, closeSettings = false) => {
      try {
        const pools = getBoardPools(size);
        const chosen = chooseBoard(
          randomApi,
          poolFor(pools, band),
          size === activeSize && band === activeBand ? currentBoard : null,
        );
        activeSize = size;
        activeBand = band;
        currentBoard = chosen.entry.board;
        focusedIndex = 0;
        state = createGameState(chosen.entry, size);
      } catch (_error) {
        disableGame(root, copy);
        return;
      }
      nodes.size.value = String(activeSize);
      nodes.band.value = activeBand;
      renderSettings();
      render();
      nodes.status.textContent = message;
      if (closeSettings) nodes.settings.open = false;
    };

    nodes.undo.addEventListener("click", () => {
      state = undoPress(state);
      render();
      nodes.status.textContent = interpolate(copy.undo, {
        lit: popcount(state.board),
        moves: state.history.length,
      });
    });
    nodes.reset.addEventListener("click", () => {
      state = resetGameState(state);
      focusedIndex = 0;
      render();
      nodes.status.textContent = copy.reset;
    });
    nodes.newPuzzle.addEventListener("click", () => startPuzzle(copy.newGame));
    for (const select of [nodes.size, nodes.band]) {
      select.addEventListener("change", () => {
        nodes.settingsStatus.textContent = "";
        try {
          renderSettings();
        } catch (_error) {
          disableGame(root, copy);
        }
      });
    }
    nodes.settingsReset.addEventListener("click", () => {
      nodes.size.value = "4";
      nodes.band.value = "medium";
      nodes.settingsStatus.textContent = copy.defaultsReady;
      renderSettings();
    });
    nodes.apply.addEventListener("click", () => {
      let draft;
      try {
        draft = draftConfig();
      } catch (_error) {
        disableGame(root, copy);
        return;
      }
      nodes.settingsStatus.textContent = copy.applied;
      startPuzzle(copy.applied, draft.size, draft.band, true);
    });

    try {
      getBoardPools(4);
    } catch (_error) {
      disableGame(root, copy);
      return;
    }
    root.dataset.lightsReady = "true";
    nodes.interactive.hidden = false;
    startPuzzle("");
  };

  const initialize = (root) => {
    if (root.dataset.lightsBound === "true") return;
    root.dataset.lightsBound = "true";
    const disclosure = root.closest("details.toy-entry");
    const maybeActivate = () => {
      if (!disclosure || disclosure.open) activate(root);
    };
    if (disclosure && !disclosure.open) disclosure.addEventListener("toggle", maybeActivate);
    else maybeActivate();
  };

  const initializeAll = () => {
    for (const root of document.querySelectorAll("[data-toy-lights-out]")) initialize(root);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  } else {
    initializeAll();
  }
})();
