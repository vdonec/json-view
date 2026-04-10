import "./style.css";

import getDataType from "./utils/getDataType.js";
import { listen, detach, element } from "./utils/dom.js";

const classes = {
  HIDDEN: "hidden",
  CARET_ICON: "caret-icon",
  CARET_RIGHT: "fa-caret-right",
  CARET_DOWN: "fa-caret-down",
  ICON: "fas",
  CONTAINER: "json-container",
  BREADCRUMB: "json-breadcrumb",
  BREADCRUMB_SEGMENT: "json-breadcrumb-segment",
  VIRTUAL_SPACER: "json-virtual-spacer",
  VIRTUAL_ROWS: "json-virtual-rows",
};

const DEFAULT_LINE_HEIGHT = 24;
const DEFAULT_OVERSCAN_ROWS = 8;
const mountedTreesByTarget = new WeakMap();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function expandedTemplate(params = {}) {
  const { key, size, isExpanded = false, valueType, showValueType = false } = params;
  const caretIconClass = isExpanded ? classes.CARET_DOWN : classes.CARET_RIGHT;
  const safeKey = escapeHtml(key ?? "");
  const safeSize = escapeHtml(size ?? "");
  const safeValueType = escapeHtml(valueType ?? "");
  const typeTemplate = showValueType
    ? `<div class="json-type">${safeValueType}</div>`
    : "";
  return `
    <div class="line">
      <div class="caret-icon"><i class="fas ${caretIconClass}"></i></div>
      <div class="json-key">${safeKey}</div>
      ${typeTemplate}
      <div class="json-size">${safeSize}</div>
    </div>
  `;
}

function notExpandedTemplate(params = {}) {
  const { key, value, type, valueType, showValueType = false } = params;
  const safeKey = escapeHtml(key ?? "");
  const safeValue = escapeHtml(value ?? "");
  const safeValueType = escapeHtml(valueType ?? "");
  const typeTemplate = showValueType
    ? `<div class="json-type">${safeValueType}</div>`
    : "";
  return `
    <div class="line">
      <div class="empty-icon"></div>
      <div class="json-key">${safeKey}</div>
      <div class="json-separator">:</div>
      ${typeTemplate}
      <div class="json-value ${type}">${safeValue}</div>
    </div>
  `;
}

// Create container element for json tree
// @return {HTMLElement}
function createContainerElement() {
  const el = element("div");
  el.className = classes.CONTAINER;
  return el;
}

function getChildCount(value, type) {
  if (type === "array") {
    return value.length;
  }

  if (type === "object" && value !== null) {
    return Object.keys(value).length;
  }

  return 0;
}

function isNodeExpandable(node) {
  return node.hasChildren;
}

function ensureChildren(node) {
  if (!isNodeExpandable(node) || node.childrenLoaded) {
    return;
  }

  Object.keys(node.value).forEach((key) => {
    const childValue = node.value[key];
    const childType = getDataType(childValue);
    const childDepth = node.depth + 1;
    const child = createNode({
      value: childValue,
      key,
      depth: childDepth,
      type: childType,
      showValueType: node.showValueType,
      isExpanded: shouldExpandByDepth(childDepth, node.expandDepthLimit),
      defaultExpanded: node.defaultExpanded,
      expandDepthLimit: node.expandDepthLimit,
      parent: node,
    });

    node.children.push(child);
  });

  node.childrenLoaded = true;
}

function ensureExpandedSubtree(node) {
  if (!node.isExpanded) {
    return;
  }

  ensureChildren(node);
  node.children.forEach((child) => ensureExpandedSubtree(child));
}

function insertAfter(containerEl, nodeEl, afterEl) {
  if (afterEl && afterEl.nextSibling) {
    containerEl.insertBefore(nodeEl, afterEl.nextSibling);
    return;
  }

  containerEl.appendChild(nodeEl);
}

function mountExpandedSubtree(node, containerEl, insertAfterEl) {
  ensureChildren(node);

  node.children.forEach((child) => {
    if (!child.el) {
      child.el = createNodeElement(child);
    }

    insertAfter(containerEl, child.el, insertAfterEl);
    insertAfterEl = child.el;

    if (child.isExpanded) {
      insertAfterEl = mountExpandedSubtree(child, containerEl, insertAfterEl);
    }
  });

  return insertAfterEl;
}

function mountExpandedChildren(node) {
  if (!node.el || !node.el.parentNode) {
    return;
  }

  mountExpandedSubtree(node, node.el.parentNode, node.el);
}

function hideNodeChildren(node) {
  node.children.forEach((child) => {
    child.el && child.el.classList.add(classes.HIDDEN);
    if (child.isExpanded) {
      hideNodeChildren(child);
    }
  });
}

function showNodeChildren(node) {
  node.children.forEach((child) => {
    child.el && child.el.classList.remove(classes.HIDDEN);
    if (child.isExpanded) {
      showNodeChildren(child);
    }
  });
}

function getRootNode(node) {
  let current = node;
  while (current && current.parent) {
    current = current.parent;
  }

  return current;
}

function getRenderState(node) {
  const root = getRootNode(node);
  return root ? root.renderState : null;
}

function isVirtualized(node) {
  const renderState = getRenderState(node);
  return !!(renderState && renderState.virtualize === true);
}

function collectVisibleNodes(node, result = []) {
  result.push(node);
  if (!node.isExpanded) {
    return result;
  }

  ensureChildren(node);
  node.children.forEach((child) => collectVisibleNodes(child, result));
  return result;
}

function createVirtualSpacer() {
  const spacer = element("div");
  spacer.className = classes.VIRTUAL_SPACER;
  return spacer;
}

function createVirtualRowsElement() {
  const rowsEl = element("div");
  rowsEl.className = classes.VIRTUAL_ROWS;
  return rowsEl;
}

function createBreadcrumbElement() {
  const breadcrumbEl = element("div");
  breadcrumbEl.className = classes.BREADCRUMB;
  return breadcrumbEl;
}

function getNodePathSegments(node) {
  const segments = [];
  let current = node;
  while (current) {
    if (current.key !== null && current.key !== undefined) {
      segments.push(String(current.key));
    }
    current = current.parent;
  }

  return segments.reverse();
}

function getNodePath(node) {
  return getNodePathSegments(node).join(" > ");
}

function getNodePathNodes(node) {
  const pathNodes = [];
  let current = node;
  while (current) {
    if (current.key !== null && current.key !== undefined) {
      pathNodes.push(current);
    }
    current = current.parent;
  }

  return pathNodes.reverse();
}

function getBreadcrumbNode(node) {
  if (!node) {
    return null;
  }

  if (!node.hasChildren && node.parent) {
    return node.parent;
  }

  return node;
}

function renderBreadcrumb(breadcrumbEl, segments, enableNavigation = true) {
  const doc = breadcrumbEl.ownerDocument;
  breadcrumbEl.textContent = "";

  if (!doc) {
    breadcrumbEl.textContent = segments.join(" > ");
    return;
  }

  segments.forEach((segment, index) => {
    if (index > 0) {
      const separator = element("i");
      separator.className = `${classes.ICON} ${classes.CARET_RIGHT}`;
      separator.setAttribute("aria-hidden", "true");
      breadcrumbEl.appendChild(doc.createTextNode(" "));
      breadcrumbEl.appendChild(separator);
      breadcrumbEl.appendChild(doc.createTextNode(" "));
    }

    const segmentEl = element("button");
    segmentEl.className = classes.BREADCRUMB_SEGMENT;
    segmentEl.setAttribute("type", "button");
    segmentEl.setAttribute("data-depth", String(index));
    if (!enableNavigation) {
      segmentEl.disabled = true;
      segmentEl.setAttribute("aria-disabled", "true");
    }
    segmentEl.textContent = segment;
    breadcrumbEl.appendChild(segmentEl);
  });
}

function getBreadcrumbHeight(renderState) {
  const { breadcrumbEl } = renderState;
  return Math.max(
    (breadcrumbEl && (breadcrumbEl.offsetHeight || breadcrumbEl.getBoundingClientRect().height)) || 0,
    0,
  );
}

function getLineOuterHeight(lineEl) {
  if (!lineEl || typeof lineEl.getBoundingClientRect !== "function") {
    return 0;
  }

  const rectHeight = lineEl.getBoundingClientRect().height || 0;
  const docView = lineEl.ownerDocument && lineEl.ownerDocument.defaultView;
  const computed = docView && docView.getComputedStyle ? docView.getComputedStyle(lineEl) : null;
  const marginTop = computed ? Number.parseFloat(computed.marginTop) || 0 : 0;
  const marginBottom = computed ? Number.parseFloat(computed.marginBottom) || 0 : 0;

  return rectHeight + Math.max(marginTop, marginBottom);
}

function getMeasuredLineStep(rowsEl) {
  if (!rowsEl || typeof rowsEl.querySelectorAll !== "function") {
    return 0;
  }

  const lines = rowsEl.querySelectorAll(".line");
  if (lines.length < 2) {
    return getLineOuterHeight(lines[0] || null);
  }

  const firstTop = lines[0].getBoundingClientRect().top;
  const secondTop = lines[1].getBoundingClientRect().top;
  const step = Math.abs(secondTop - firstTop);
  if (step > 0) {
    return step;
  }

  return getLineOuterHeight(lines[0]);
}

function scrollToVirtualNode(rootNode, targetNode) {
  const renderState = getRenderState(rootNode);
  if (!renderState || !renderState.virtualize || !targetNode) {
    return;
  }

  const visibleNodes =
    renderState.visibleNodes && renderState.visibleNodesVersion === renderState.structureVersion
      ? renderState.visibleNodes
      : collectVisibleNodes(rootNode);

  if (visibleNodes !== renderState.visibleNodes) {
    renderState.visibleNodes = visibleNodes;
    renderState.visibleNodesVersion = renderState.structureVersion;
  }

  const nodeIndex = visibleNodes.indexOf(targetNode);
  if (nodeIndex < 0) {
    return;
  }

  const lineHeight = Math.max(renderState.lineHeight || DEFAULT_LINE_HEIGHT, 1);
  const breadcrumbHeight = getBreadcrumbHeight(renderState);
  const rowScrollTop = nodeIndex * lineHeight;
  let targetScrollTop = rowScrollTop + breadcrumbHeight;

  if (renderState.viewportEl !== renderState.containerEl) {
    const containerTop = getOffsetTopWithin(renderState.containerEl, renderState.viewportEl);
    targetScrollTop += containerTop;
  }

  renderState.viewportEl.scrollTop = targetScrollTop;
  scheduleVirtualRender(rootNode);
}

function handleBreadcrumbClick(rootNode, event) {
  const renderState = getRenderState(rootNode);
  if (!renderState || !renderState.breadcrumbEl || renderState.enableScrollPathNavigation === false) {
    return;
  }

  const target = event.target;
  if (!target || typeof target.closest !== "function") {
    return;
  }

  const segmentEl = target.closest(`.${classes.BREADCRUMB_SEGMENT}`);
  if (!segmentEl || !renderState.breadcrumbEl.contains(segmentEl)) {
    return;
  }

  const depth = Number.parseInt(segmentEl.getAttribute("data-depth") || "", 10);
  if (!Number.isInteger(depth) || !renderState.breadcrumbNodes || !renderState.breadcrumbNodes[depth]) {
    return;
  }

  scrollToVirtualNode(rootNode, renderState.breadcrumbNodes[depth]);
}

function updateBreadcrumb(renderState, visibleNodes, anchorIndex) {
  if (!renderState || !renderState.breadcrumbEl) {
    return;
  }

  const node = visibleNodes[anchorIndex] || visibleNodes[0] || null;
  const breadcrumbNode = getBreadcrumbNode(node);
  const breadcrumbNodes = getNodePathNodes(breadcrumbNode);
  const breadcrumbSegments = breadcrumbNodes.map((pathNode) => String(pathNode.key));
  const path = getNodePath(breadcrumbNode);
  if (renderState.breadcrumbPath !== path) {
    renderState.breadcrumbPath = path;
    renderState.breadcrumbEl.setAttribute("data-path", path);
    renderBreadcrumb(
      renderState.breadcrumbEl,
      breadcrumbSegments,
      renderState.enableScrollPathNavigation !== false,
    );
  }
  renderState.breadcrumbNodes = breadcrumbNodes;
}

function isElementLike(value) {
  return !!value && value.nodeType === 1 && typeof value.addEventListener === "function";
}

function resolveViewportElement(containerEl, options = {}) {
  return isElementLike(options.viewportElement) ? options.viewportElement : containerEl;
}

function getOffsetTopWithin(elementEl, ancestorEl) {
  let offset = 0;
  let current = elementEl;

  while (current && current !== ancestorEl) {
    offset += current.offsetTop || 0;
    current = current.offsetParent;
  }

  return current === ancestorEl ? offset : 0;
}

function scheduleVirtualRender(rootNode) {
  const renderState = getRenderState(rootNode);
  if (!renderState || !renderState.virtualize || renderState.pendingFrame) {
    return;
  }

  const scheduler =
    typeof window !== "undefined" && window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(cb, 0);

  renderState.pendingFrame = scheduler(() => {
    renderState.pendingFrame = null;
    renderVirtualizedTree(rootNode);
  });
}

function markVirtualStructureDirty(node) {
  const renderState = getRenderState(node);
  if (!renderState || !renderState.virtualize) {
    return;
  }

  renderState.structureVersion += 1;
  renderState.startIndex = -1;
  renderState.endIndex = -1;
}

function renderVirtualizedTree(rootNode) {
  const renderState = getRenderState(rootNode);
  if (!renderState || !renderState.virtualize) {
    return;
  }

  const { containerEl, viewportEl, topSpacerEl, bottomSpacerEl, breadcrumbEl, rowsEl } = renderState;
  const visibleNodes =
    renderState.visibleNodes && renderState.visibleNodesVersion === renderState.structureVersion
      ? renderState.visibleNodes
      : collectVisibleNodes(rootNode);

  if (visibleNodes !== renderState.visibleNodes) {
    renderState.visibleNodes = visibleNodes;
    renderState.visibleNodesVersion = renderState.structureVersion;
  }

  const totalCount = visibleNodes.length;
  const viewportHeight = Math.max(viewportEl.clientHeight || 0, 0);
  const viewportScrollTop = Math.max(viewportEl.scrollTop || 0, 0);
  const lineHeight = Math.max(renderState.lineHeight || DEFAULT_LINE_HEIGHT, 1);
  const overscanRows = Math.max(renderState.overscanRows || DEFAULT_OVERSCAN_ROWS, 0);
  const breadcrumbHeight = getBreadcrumbHeight(renderState);
  let scrollTop = viewportScrollTop;

  if (viewportEl !== containerEl) {
    const containerTop = getOffsetTopWithin(containerEl, viewportEl);
    scrollTop = Math.max(viewportScrollTop - containerTop, 0);
  }

  const rowsScrollTop = Math.max(scrollTop - breadcrumbHeight, 0);

  // Use a fallback height when the viewport has not been laid out yet (clientHeight === 0).
  // This prevents rendering the entire tree on the first synchronous call before browser layout.
  const effectiveViewportHeightBase = viewportHeight > 0 ? viewportHeight : lineHeight * 20;
  const effectiveViewportHeight = Math.max(effectiveViewportHeightBase - breadcrumbHeight, lineHeight);

  const anchorIndex = Math.min(Math.floor(rowsScrollTop / lineHeight), Math.max(totalCount - 1, 0));
  updateBreadcrumb(renderState, visibleNodes, anchorIndex);

  const startIndex = Math.max(Math.floor(rowsScrollTop / lineHeight) - overscanRows, 0);
  const endIndex = Math.min(
    Math.ceil((rowsScrollTop + effectiveViewportHeight) / lineHeight) + overscanRows,
    totalCount,
  );

  const topHeight = startIndex * lineHeight;
  const bottomHeight = Math.max(totalCount - endIndex, 0) * lineHeight;
  topSpacerEl.style.height = `${topHeight}px`;
  bottomSpacerEl.style.height = `${bottomHeight}px`;

  if (
    renderState.startIndex === startIndex &&
    renderState.endIndex === endIndex &&
    renderState.totalCount === totalCount
  ) {
    return;
  }

  renderState.startIndex = startIndex;
  renderState.endIndex = endIndex;
  renderState.totalCount = totalCount;

  rowsEl.textContent = "";
  rowsEl.appendChild(topSpacerEl);

  for (let index = startIndex; index < endIndex; index += 1) {
    const node = visibleNodes[index];
    if (!node.el) {
      node.el = createNodeElement(node);
    }

    node.el.classList.remove(classes.HIDDEN);
    rowsEl.appendChild(node.el);
  }

  rowsEl.appendChild(bottomSpacerEl);

  const measuredStep = getMeasuredLineStep(rowsEl);
  if (measuredStep > 0) {
    renderState.lineHeight = measuredStep;
  }
}

function initVirtualization(rootNode, containerEl, options = {}) {
  const overscanRows =
    Number.isInteger(options.overscanRows) && options.overscanRows >= 0
      ? options.overscanRows
      : DEFAULT_OVERSCAN_ROWS;
  const showScrollPath = options.showScrollPath !== false;
  const enableScrollPathNavigation = options.enableScrollPathNavigation !== false;
  const topSpacerEl = createVirtualSpacer();
  const bottomSpacerEl = createVirtualSpacer();
  const breadcrumbEl = showScrollPath ? createBreadcrumbElement() : null;
  const rowsEl = createVirtualRowsElement();
  const viewportEl = resolveViewportElement(containerEl, options);
  const handleViewportChange = () => scheduleVirtualRender(rootNode);
  const onBreadcrumbClick = (event) => handleBreadcrumbClick(rootNode, event);

  if (breadcrumbEl) {
    containerEl.appendChild(breadcrumbEl);
    if (enableScrollPathNavigation) {
      breadcrumbEl.addEventListener("click", onBreadcrumbClick);
    }
  }
  containerEl.appendChild(rowsEl);

  viewportEl.addEventListener("scroll", handleViewportChange);

  if (typeof window !== "undefined") {
    window.addEventListener("resize", handleViewportChange);
  }

  // ResizeObserver tracks viewport height changes (e.g. parent grows to max-height
  // after Expand All), which requestAnimationFrame alone misses on first frame.
  let resizeObserver = null;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(handleViewportChange);
    resizeObserver.observe(viewportEl);
  }

  rootNode.renderState = {
    virtualize: true,
    containerEl,
    viewportEl,
    showScrollPath,
    enableScrollPathNavigation,
    breadcrumbEl,
    breadcrumbPath: "",
    breadcrumbNodes: [],
    rowsEl,
    topSpacerEl,
    bottomSpacerEl,
    overscanRows,
    lineHeight: DEFAULT_LINE_HEIGHT,
    pendingFrame: null,
    structureVersion: 0,
    visibleNodes: null,
    visibleNodesVersion: -1,
    startIndex: -1,
    endIndex: -1,
    totalCount: 0,
    handleViewportChange,
    onBreadcrumbClick: enableScrollPathNavigation ? onBreadcrumbClick : null,
    resizeObserver,
  };
}

function cleanupVirtualization(rootNode) {
  const renderState = getRenderState(rootNode);
  if (!renderState || !renderState.virtualize) {
    return;
  }

  renderState.viewportEl.removeEventListener("scroll", renderState.handleViewportChange);

  if (renderState.breadcrumbEl && renderState.onBreadcrumbClick) {
    renderState.breadcrumbEl.removeEventListener("click", renderState.onBreadcrumbClick);
  }

  if (renderState.resizeObserver) {
    renderState.resizeObserver.disconnect();
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("resize", renderState.handleViewportChange);
    if (renderState.pendingFrame && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(renderState.pendingFrame);
    }
  }

  rootNode.renderState = null;
}

function setCaretIconDown(node) {
  if (isNodeExpandable(node) && node.el) {
    const icon = node.el.querySelector("." + classes.ICON);
    if (icon) {
      icon.classList.replace(classes.CARET_RIGHT, classes.CARET_DOWN);
    }
  }
}

function setCaretIconRight(node) {
  if (isNodeExpandable(node) && node.el) {
    const icon = node.el.querySelector("." + classes.ICON);
    if (icon) {
      icon.classList.replace(classes.CARET_DOWN, classes.CARET_RIGHT);
    }
  }
}

export function toggleNode(node) {
  if (isVirtualized(node)) {
    node.isExpanded = !node.isExpanded;
    if (node.isExpanded) {
      ensureExpandedSubtree(node);
      setCaretIconDown(node);
    } else {
      setCaretIconRight(node);
    }

    markVirtualStructureDirty(node);
    scheduleVirtualRender(getRootNode(node));
    return;
  }

  if (node.isExpanded) {
    node.isExpanded = false;
    setCaretIconRight(node);
    hideNodeChildren(node);
  } else {
    node.isExpanded = true;
    ensureExpandedSubtree(node);
    mountExpandedChildren(node);
    setCaretIconDown(node);
    showNodeChildren(node);
  }
}

/**
 * Create node html element
 * @param {object} node
 * @return html element
 */
function createNodeElement(node) {
  let el = element("div");

  const getSizeString = (node) => {
    const len = node.childCount;
    if (node.type === "array") return `[${len}]`;
    if (node.type === "object") return `{${len}}`;

    return null;
  };

  const getValueString = (node) => {
    switch (node.type) {
      case "string":
        return node.value ? `${node.value}` : '""';

      case "number":
      case "boolean":
      case "null":
        return `${node.value}`;

      case "array":
        return `[${node.childCount}]`;

      case "object":
        return `{${node.childCount}}`;

      default:
        return `${node.value}`;
    }
  };

  const getValueClassName = (node) => {
    switch (node.type) {
      case "string":
      case "number":
      case "boolean":
      case "null":
      case "array":
      case "object":
        return `json-${node.type}`;
      default:
        return `json-${typeof node.value}`;
    }
  };

  if (isNodeExpandable(node)) {
    el.innerHTML = expandedTemplate({
      key: node.key,
      size: getSizeString(node),
      isExpanded: node.isExpanded,
      valueType: node.type,
      showValueType: node.showValueType,
    });
    const caretEl = el.querySelector("." + classes.CARET_ICON);
    node.dispose = listen(caretEl, "click", () => toggleNode(node));
  } else {
    el.innerHTML = notExpandedTemplate({
      key: node.key,
      value: getValueString(node),
      type: getValueClassName(node),
      valueType: node.type,
      showValueType: node.showValueType,
    });
  }

  const lineEl = el.children[0];

  if (node.parent !== null) {
    if (node.parent.isExpanded) {
      lineEl.classList.remove(classes.HIDDEN);
    } else {
      lineEl.classList.add(classes.HIDDEN);
    }
  }

  lineEl.style = "margin-left: " + node.depth * 18 + "px;";

  return lineEl;
}

/**
 * @typedef {(node: object) => void} Callback
 */

/**
 * Recursively traverse Tree object
 * @param {Object} node
 * @param {Callback} callback
 */
export function traverse(node, callback) {
  callback(node);
  if (node.children.length > 0) {
    node.children.forEach((child) => {
      traverse(child, callback);
    });
  }
}

/**
 * Create node object
 * @param {object} opt options
 * @return {object}
 */
function createNode(opt = {}) {
  let value = opt.hasOwnProperty("value") ? opt.value : null;
  const type = opt.type || getDataType(value);
  const childCount = getChildCount(value, type);
  const expandDepthLimit =
    typeof opt.expandDepthLimit === "number"
      ? opt.expandDepthLimit
      : opt.defaultExpanded === true
      ? Number.POSITIVE_INFINITY
      : -1;

  return {
    key: opt.key || null,
    parent: opt.parent || null,
    value: value,
    isExpanded: opt.isExpanded || false,
    defaultExpanded: opt.defaultExpanded || false,
    type,
    showValueType: opt.showValueType === true,
    hasChildren: childCount > 0,
    childCount,
    children: opt.children || [],
    childrenLoaded: opt.childrenLoaded || false,
    expandDepthLimit,
    el: opt.el || null,
    depth: opt.depth || 0,
    dispose: null,
    renderState: opt.renderState || null,
  };
}

function getExpandDepthLimit(defaultExpanded) {
  if (defaultExpanded === true) {
    return Number.POSITIVE_INFINITY;
  }

  if (Number.isInteger(defaultExpanded) && defaultExpanded >= 0) {
    return defaultExpanded;
  }

  return -1;
}

function shouldExpandByDepth(depth, expandDepthLimit) {
  return depth <= expandDepthLimit;
}

function getJsonObject(data) {
  return typeof data === "string" ? JSON.parse(data) : data;
}

/**
 * Create tree
 * @param {object | string} jsonData
 * @param {object} options
 * @param {boolean | number} options.defaultExpanded - true expands all nodes; number expands nodes up to that depth (root = 0)
 * @param {boolean} options.showValueType - true adds type label before leaf value
 * @return {object}
 */
export function create(jsonData, options = {}) {
  const parsedData = getJsonObject(jsonData);
  const defaultExpanded = options.defaultExpanded === true;
  const expandDepthLimit = getExpandDepthLimit(options.defaultExpanded);
  const showValueType = options.showValueType === true;
  const rootNode = createNode({
    value: parsedData,
    key: getDataType(parsedData),
    type: getDataType(parsedData),
    showValueType,
    isExpanded: shouldExpandByDepth(0, expandDepthLimit),
    defaultExpanded,
    expandDepthLimit,
  });

  ensureExpandedSubtree(rootNode);

  return rootNode;
}

/**
 * Render JSON string into DOM container
 * @param {string | object} jsonData
 * @param {HTMLElement} targetElement
 * @param {object} options
 * @param {boolean} options.showValueType - true adds type label before leaf value
 * @param {boolean} options.virtualize - true renders only viewport rows
 * @param {boolean} options.showScrollPath - true shows sticky path for top visible row (virtualize mode)
 * @param {boolean} options.enableScrollPathNavigation - true enables click-to-scroll by breadcrumb path
 * @param {number} options.overscanRows - extra rows above/below viewport
 * @param {HTMLElement} options.viewportElement - external scroll container for virtualization
 * @return {object} tree
 */
export function renderJSON(jsonData, targetElement, options = {}) {
  const parsedData = getJsonObject(jsonData);
  const tree = create(parsedData, options);
  render(tree, targetElement, options);

  return tree;
}

/**
 * Render tree into DOM container
 * @param {object} tree
 * @param {HTMLElement} targetElement
 * @param {object} options
 * @param {boolean} options.virtualize
 * @param {boolean} options.showScrollPath
 * @param {boolean} options.enableScrollPathNavigation
 * @param {number} options.overscanRows
 * @param {HTMLElement} options.viewportElement
 */
export function render(tree, targetElement, options = {}) {
  const mountedTree = mountedTreesByTarget.get(targetElement);
  const mountedContainer = mountedTree && mountedTree.renderState && mountedTree.renderState.containerEl;

  if (mountedTree && mountedContainer && mountedContainer.isConnected) {
    throw new Error(
      "Target element already contains a rendered json-view tree. Call destroy(tree) before rendering again.",
    );
  }

  if (mountedTree && (!mountedContainer || !mountedContainer.isConnected)) {
    mountedTreesByTarget.delete(targetElement);
  }

  const containerEl = createContainerElement();

  ensureExpandedSubtree(tree);

  if (options.virtualize === true) {
    initVirtualization(tree, containerEl, options);
  } else {
    traverse(tree, function (node) {
      node.el = createNodeElement(node);
      containerEl.appendChild(node.el);
    });
    tree.renderState = {
      virtualize: false,
      containerEl,
      targetElement,
    };
  }

  if (tree.renderState) {
    tree.renderState.targetElement = targetElement;
  }

  targetElement.appendChild(containerEl);
  mountedTreesByTarget.set(targetElement, tree);

  if (options.virtualize === true) {
    renderVirtualizedTree(tree);
  }
}

export function expand(node) {
  if (isVirtualized(node)) {
    node.isExpanded = true;
    ensureChildren(node);

    node.children.forEach((child) => {
      expand(child);
    });

    traverse(node, function (child) {
      child.isExpanded = true;
      setCaretIconDown(child);
    });

    markVirtualStructureDirty(node);
    scheduleVirtualRender(getRootNode(node));
    return;
  }

  node.isExpanded = true;
  ensureChildren(node);

  node.children.forEach((child) => {
    expand(child);
  });

  mountExpandedChildren(node);

  traverse(node, function (child) {
    child.el && child.el.classList.remove(classes.HIDDEN);
    child.isExpanded = true;
    setCaretIconDown(child);
  });
}

export function collapse(node) {
  if (isVirtualized(node)) {
    traverse(node, function (child) {
      child.isExpanded = false;
      setCaretIconRight(child);
    });
    markVirtualStructureDirty(node);
    scheduleVirtualRender(getRootNode(node));
    return;
  }

  traverse(node, function (child) {
    child.isExpanded = false;
    if (child.depth > node.depth) {
      child.el && child.el.classList.add(classes.HIDDEN);
    }
    setCaretIconRight(child);
  });
}

export function destroy(tree) {
  const renderState = tree.renderState;
  const containerEl = renderState ? renderState.containerEl : tree.el && tree.el.parentNode;
  const targetElement = renderState ? renderState.targetElement : null;

  cleanupVirtualization(tree);

  traverse(tree, (node) => {
    if (node.dispose) {
      node.dispose();
    }
  });
  if (containerEl) {
    detach(containerEl);
  }

  if (targetElement && mountedTreesByTarget.get(targetElement) === tree) {
    mountedTreesByTarget.delete(targetElement);
  }
}

/**
 * Export public interface
 */
export default {
  toggleNode,
  render,
  create,
  renderJSON,
  expand,
  collapse,
  traverse,
  destroy,
};
