import jsonview from "./json-view.js";

const selectors = {
  root: "#root",
  status: "#status",
  stats: "#stats",
  expand: "#btn-expand-all",
  collapse: "#btn-collapse-all",
  generateLarge: "#btn-generate-large",
  loadExample: "#btn-load-example",
  showValueType: "#opt-show-value-type",
  virtualize: "#opt-virtualize",
  showScrollPath: "#opt-show-scroll-path",
  enableScrollPathNavigation: "#opt-enable-scroll-path-navigation",
  defaultExpandedAll: "#opt-default-expanded-all",
  defaultExpandedEnabled: "#opt-default-expanded-enabled",
  defaultExpandedDepth: "#opt-default-expanded-depth",
  overscanRows: "#opt-overscan-rows",
};

const state = {
  rootEl: null,
  currentTree: null,
  currentData: null,
  statsObserver: null,
};

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function getRenderOptions() {
  const showValueTypeEl = document.querySelector(selectors.showValueType);
  const virtualizeEl = document.querySelector(selectors.virtualize);
  const showScrollPathEl = document.querySelector(selectors.showScrollPath);
  const enableScrollPathNavigationEl = document.querySelector(selectors.enableScrollPathNavigation);
  const defaultExpandedAllEl = document.querySelector(selectors.defaultExpandedAll);
  const defaultExpandedEnabledEl = document.querySelector(selectors.defaultExpandedEnabled);
  const defaultExpandedDepthEl = document.querySelector(selectors.defaultExpandedDepth);
  const overscanRowsEl = document.querySelector(selectors.overscanRows);

  const options = {
    showValueType: showValueTypeEl ? showValueTypeEl.checked : true,
    virtualize: virtualizeEl ? virtualizeEl.checked : true,
  };

  const defaultExpandedEnabled = defaultExpandedEnabledEl
    ? defaultExpandedEnabledEl.checked
    : true;
  const expandAll = defaultExpandedAllEl ? defaultExpandedAllEl.checked : false;

  if (defaultExpandedEnabled) {
    options.defaultExpanded = expandAll
      ? true
      : parseNonNegativeInt(defaultExpandedDepthEl ? defaultExpandedDepthEl.value : "0", 0);
  }

  if (options.virtualize) {
    options.showScrollPath = showScrollPathEl ? showScrollPathEl.checked : true;
    options.enableScrollPathNavigation = enableScrollPathNavigationEl
      ? enableScrollPathNavigationEl.checked
      : true;
    options.overscanRows = parseNonNegativeInt(overscanRowsEl ? overscanRowsEl.value : "8", 8);
    options.viewportElement = state.rootEl;
  }

  return options;
}

function syncOptionControlsState() {
  const virtualizeEl = document.querySelector(selectors.virtualize);
  const showScrollPathEl = document.querySelector(selectors.showScrollPath);
  const enableScrollPathNavigationEl = document.querySelector(selectors.enableScrollPathNavigation);
  const overscanRowsEl = document.querySelector(selectors.overscanRows);
  const defaultExpandedAllEl = document.querySelector(selectors.defaultExpandedAll);
  const defaultExpandedEnabledEl = document.querySelector(selectors.defaultExpandedEnabled);
  const defaultExpandedDepthEl = document.querySelector(selectors.defaultExpandedDepth);

  if (showScrollPathEl && virtualizeEl) {
    showScrollPathEl.disabled = !virtualizeEl.checked;
  }

  if (overscanRowsEl && virtualizeEl) {
    overscanRowsEl.disabled = !virtualizeEl.checked;
  }

  if (enableScrollPathNavigationEl && virtualizeEl && showScrollPathEl) {
    enableScrollPathNavigationEl.disabled = !virtualizeEl.checked || !showScrollPathEl.checked;
  }

  if (defaultExpandedDepthEl && defaultExpandedEnabledEl && defaultExpandedAllEl) {
    defaultExpandedDepthEl.disabled =
      !defaultExpandedEnabledEl.checked || defaultExpandedAllEl.checked;
  }
}

async function loadExampleData() {
  const urls = [
    new URL("../public/example2.json", import.meta.url).href,
    "./example2.json",
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.text();
      }
    } catch {
      // try next URL
    }
  }

  throw new Error("Failed to load JSON example file");
}

function setStatus(text, isError = false) {
  const statusEl = document.querySelector(selectors.status);
  if (!statusEl) {
    return;
  }

  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#667085";
}

function setStats(text) {
  const statsEl = document.querySelector(selectors.stats);
  if (!statsEl) {
    return;
  }

  statsEl.textContent = text;
}

function updateStats(rootEl) {
  const container = rootEl.querySelector(".json-container");
  if (!container) {
    setStats("Visible: 0 | Hidden: 0 | Total: 0");
    return;
  }

  const total = container.querySelectorAll(".line").length;
  const hidden = container.querySelectorAll(".line.hidden").length;
  const visible = total - hidden;
  setStats(`Visible: ${visible} | Hidden: ${hidden} | Total: ${total}`);
}

function generateLargeJsonData(depth = 5, width = 6, level = 0) {
  if (level >= depth) {
    return {
      id: `${level}-${Math.random().toString(36).slice(2, 8)}`,
      active: level % 2 === 0,
      score: Number((Math.random() * 100).toFixed(2)),
      tags: ["leaf", `level-${level}`],
    };
  }

  const items = [];
  for (let i = 0; i < width; i += 1) {
    items.push({
      index: i,
      label: `node-${level}-${i}`,
      payload: generateLargeJsonData(depth, width, level + 1),
    });
  }

  return {
    level,
    createdAt: new Date().toISOString(),
    items,
  };
}

function renderTree(data, statusText) {
  if (!state.rootEl) {
    return;
  }

  if (state.currentTree) {
    jsonview.destroy(state.currentTree);
    state.currentTree = null;
  }

  state.currentData = data;
  state.rootEl.innerHTML = "";
  state.currentTree = jsonview.renderJSON(data, state.rootEl, getRenderOptions());
  updateStats(state.rootEl);
  setStatus(statusText, false);
}

function rerenderCurrentData(statusText = "Options updated and tree re-rendered.") {
  if (state.currentData === null) {
    return;
  }

  renderTree(state.currentData, statusText);
}

function bindControls() {
  const expandBtn = document.querySelector(selectors.expand);
  const collapseBtn = document.querySelector(selectors.collapse);
  const generateLargeBtn = document.querySelector(selectors.generateLarge);
  const loadExampleBtn = document.querySelector(selectors.loadExample);
  const showValueTypeEl = document.querySelector(selectors.showValueType);
  const virtualizeEl = document.querySelector(selectors.virtualize);
  const showScrollPathEl = document.querySelector(selectors.showScrollPath);
  const enableScrollPathNavigationEl = document.querySelector(selectors.enableScrollPathNavigation);
  const defaultExpandedAllEl = document.querySelector(selectors.defaultExpandedAll);
  const defaultExpandedEnabledEl = document.querySelector(selectors.defaultExpandedEnabled);
  const defaultExpandedDepthEl = document.querySelector(selectors.defaultExpandedDepth);
  const overscanRowsEl = document.querySelector(selectors.overscanRows);

  expandBtn &&
    expandBtn.addEventListener("click", () => {
      if (!state.currentTree) {
        return;
      }

      jsonview.expand(state.currentTree);
      updateStats(state.rootEl);
    });

  collapseBtn &&
    collapseBtn.addEventListener("click", () => {
      if (!state.currentTree) {
        return;
      }

      jsonview.collapse(state.currentTree);
      updateStats(state.rootEl);
    });

  generateLargeBtn &&
    generateLargeBtn.addEventListener("click", () => {
      setStatus("Generating large JSON...", false);
      const largeData = {
        source: "generated",
        generatedAt: new Date().toISOString(),
        data: generateLargeJsonData(4, 7),
      };

      renderTree(largeData, "Large JSON generated and rendered.");
    });

  loadExampleBtn &&
    loadExampleBtn.addEventListener("click", async () => {
      try {
        setStatus("Loading example2.json...", false);
        const data = await loadExampleData();
        renderTree(data, "example2.json loaded and rendered.");
      } catch (error) {
        setStatus(error.message, true);
        console.error(error);
      }
    });

  const optionControls = [
    showValueTypeEl,
    virtualizeEl,
    showScrollPathEl,
    enableScrollPathNavigationEl,
    defaultExpandedAllEl,
    defaultExpandedEnabledEl,
    defaultExpandedDepthEl,
    overscanRowsEl,
  ];

  optionControls.forEach((control) => {
    control &&
      control.addEventListener("change", () => {
        syncOptionControlsState();
        rerenderCurrentData();
      });
  });

  syncOptionControlsState();

  const observer = new MutationObserver(() => updateStats(state.rootEl));
  observer.observe(state.rootEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  state.statsObserver = observer;
}

async function initDemo() {
  state.rootEl = document.querySelector(selectors.root);
  if (!state.rootEl) {
    throw new Error("Root element #root is not found");
  }

  try {
    setStatus("Loading example...", false);
    const data = await loadExampleData();
    bindControls();
    renderTree(data, "Example loaded. Use controls to switch data and expand/collapse.");
  } catch (error) {
    setStatus(error.message, true);
    console.error(error);
  }
}

initDemo();
