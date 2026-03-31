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
};

function expandedTemplate(params = {}) {
  const { key, size, isExpanded = false, valueType, showValueType = false } = params;
  const caretIconClass = isExpanded ? classes.CARET_DOWN : classes.CARET_RIGHT;
  const typeTemplate = showValueType
    ? `<div class="json-type">${valueType}</div>`
    : "";
  return `
    <div class="line">
      <div class="caret-icon"><i class="fas ${caretIconClass}"></i></div>
      <div class="json-key">${key}</div>
      ${typeTemplate}
      <div class="json-size">${size}</div>
    </div>
  `;
}

function notExpandedTemplate(params = {}) {
  const { key, value, type, valueType, showValueType = false } = params;
  const typeTemplate = showValueType
    ? `<div class="json-type">${valueType}</div>`
    : "";
  return `
    <div class="line">
      <div class="empty-icon"></div>
      <div class="json-key">${key}</div>
      <div class="json-separator">:</div>
      ${typeTemplate}
      <div class="json-value ${type}">${value}</div>
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
 * @return {object} tree
 */
export function renderJSON(jsonData, targetElement, options = {}) {
  const parsedData = getJsonObject(jsonData);
  const tree = create(parsedData, options);
  render(tree, targetElement);

  return tree;
}

/**
 * Render tree into DOM container
 * @param {object} tree
 * @param {HTMLElement} targetElement
 */
export function render(tree, targetElement) {
  const containerEl = createContainerElement();

  ensureExpandedSubtree(tree);

  traverse(tree, function (node) {
    node.el = createNodeElement(node);
    containerEl.appendChild(node.el);
  });

  targetElement.appendChild(containerEl);
}

export function expand(node) {
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
  traverse(node, function (child) {
    child.isExpanded = false;
    if (child.depth > node.depth) {
      child.el && child.el.classList.add(classes.HIDDEN);
    }
    setCaretIconRight(child);
  });
}

export function destroy(tree) {
  traverse(tree, (node) => {
    if (node.dispose) {
      node.dispose();
    }
  });
  detach(tree.el.parentNode);
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
