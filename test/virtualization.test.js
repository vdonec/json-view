import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { renderJSON, traverse, collapse, expand, destroy } from "../dist/jsonview.js";

function createLargeFlatObject(size = 120) {
  const payload = {};
  for (let index = 0; index < size; index += 1) {
    payload[`key_${index}`] = `value_${index}`;
  }

  return payload;
}

function waitForVirtualization(window) {
  if (window.requestAnimationFrame) {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }

  return new Promise((resolve) => setTimeout(resolve, 20));
}

test("virtualize=true keeps only viewport rows in DOM and updates on scroll", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = createLargeFlatObject(200);
  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 4,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  Object.defineProperty(container, "clientHeight", {
    value: 120,
    configurable: true,
  });

  container.scrollTop = 0;
  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist for virtualized render");
  assert.equal(breadcrumb.textContent, "object", "initial breadcrumb should point to root");

  let totalVisible = 0;
  traverse(tree, () => {
    totalVisible += 1;
  });

  const initiallyRendered = container.querySelectorAll(".line").length;
  assert.ok(initiallyRendered < totalVisible, "virtualized render should keep only subset of rows");

  container.scrollTop = 900;
  container.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  assert.equal(
    breadcrumb.textContent,
    "object",
    "breadcrumb should omit last segment when top visible node is a leaf",
  );

  const topSpacer = container.querySelector(".json-virtual-spacer");
  assert.ok(topSpacer, "top spacer should exist");
  assert.notEqual(topSpacer.style.height, "0px", "top spacer height should grow after scrolling");

  destroy(tree);
  assert.equal(root.querySelector(".json-container"), null, "destroy should remove container");

  delete globalThis.window;
  delete globalThis.document;
});

test("virtualized tree stays virtualized after collapse/expand", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = {
    level: 0,
    group: createLargeFlatObject(100),
  };

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 2,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  Object.defineProperty(container, "clientHeight", {
    value: 100,
    configurable: true,
  });

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const beforeCollapse = container.querySelectorAll(".line").length;
  collapse(tree);
  await waitForVirtualization(window);
  const afterCollapse = container.querySelectorAll(".line").length;

  expand(tree);
  await waitForVirtualization(window);
  const afterExpand = container.querySelectorAll(".line").length;

  assert.ok(afterCollapse <= beforeCollapse, "collapse should not increase rendered rows");
  assert.ok(afterExpand <= 20, "expand should keep rendered rows bounded by viewport and overscan");

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("virtualization supports external viewportElement", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  Object.defineProperty(root, "clientHeight", {
    value: 120,
    configurable: true,
  });

  const data = createLargeFlatObject(220);
  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 3,
    viewportElement: root,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  let totalVisible = 0;
  traverse(tree, () => {
    totalVisible += 1;
  });

  const beforeScroll = container.querySelectorAll(".line").length;
  assert.ok(beforeScroll < totalVisible, "external viewport should still keep subset in DOM");

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist for external viewport mode");
  assert.equal(breadcrumb.textContent, "object", "initial breadcrumb should point to root");

  root.scrollTop = 1000;
  root.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  assert.equal(
    breadcrumb.textContent,
    "object",
    "breadcrumb should omit leaf segment with external viewport scroll",
  );

  const topSpacer = container.querySelector(".json-virtual-spacer");
  assert.ok(topSpacer, "top spacer should exist");
  assert.notEqual(topSpacer.style.height, "0px", "top spacer should reflect parent scroll");

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("virtualize mode hides breadcrumb when showScrollPath=false", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = createLargeFlatObject(80);
  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    showScrollPath: false,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  assert.equal(
    container.querySelector(".json-breadcrumb"),
    null,
    "breadcrumb should not render when showScrollPath is disabled",
  );

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("breadcrumb omits trailing leaf segment for nested top visible row", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = {
    data: {
      items: [
        {
          payload: "leaf-value",
          meta: { id: 1 },
        },
      ],
    },
  };

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 0,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  Object.defineProperty(container, "clientHeight", {
    value: 24,
    configurable: true,
  });

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist");

  container.scrollTop = 96;
  container.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  assert.equal(
    breadcrumb.getAttribute("data-path"),
    "object > data > items > 0",
    "breadcrumb should stop at parent when top visible row is leaf payload",
  );
  assert.equal(
    breadcrumb.querySelectorAll(".fa-caret-right").length,
    3,
    "breadcrumb should render caret separators between path segments",
  );

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("breadcrumb omits trailing leaf segment with external viewportElement", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  Object.defineProperty(root, "clientHeight", {
    value: 24,
    configurable: true,
  });

  const data = {
    data: {
      items: [
        {
          payload: "leaf-value",
          meta: { id: 1 },
        },
      ],
    },
  };

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 0,
    viewportElement: root,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist");

  root.scrollTop = 96;
  root.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  assert.equal(
    breadcrumb.getAttribute("data-path"),
    "object > data > items > 0",
    "breadcrumb should stop at parent for leaf row with external viewport",
  );
  assert.equal(
    breadcrumb.querySelectorAll(".fa-caret-right").length,
    3,
    "breadcrumb should render caret separators for external viewport path",
  );

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("clicking breadcrumb segment scrolls to selected path node", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = {
    data: {
      items: [
        {
          payload: "leaf-value",
          meta: { id: 1 },
        },
      ],
    },
  };

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 0,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  Object.defineProperty(container, "clientHeight", {
    value: 24,
    configurable: true,
  });

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist");

  container.scrollTop = 96;
  container.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  const beforeClickScrollTop = container.scrollTop;
  const dataSegment = Array.from(breadcrumb.querySelectorAll(".json-breadcrumb-segment")).find(
    (segment) => segment.textContent === "data",
  );
  assert.ok(dataSegment, "data segment should exist in breadcrumb");

  dataSegment.click();
  await waitForVirtualization(window);

  assert.ok(container.scrollTop < beforeClickScrollTop, "click should scroll up to selected breadcrumb node");
  assert.equal(
    breadcrumb.getAttribute("data-path"),
    "object > data",
    "breadcrumb should update to clicked path node",
  );

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});

test("breadcrumb click does not scroll when enableScrollPathNavigation=false", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const data = {
    data: {
      items: [
        {
          payload: "leaf-value",
          meta: { id: 1 },
        },
      ],
    },
  };

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    virtualize: true,
    overscanRows: 0,
    enableScrollPathNavigation: false,
  });

  const container = root.querySelector(".json-container");
  assert.ok(container, "json container should exist");

  Object.defineProperty(container, "clientHeight", {
    value: 24,
    configurable: true,
  });

  window.dispatchEvent(new window.Event("resize"));
  await waitForVirtualization(window);

  const breadcrumb = container.querySelector(".json-breadcrumb");
  assert.ok(breadcrumb, "breadcrumb should exist");

  container.scrollTop = 96;
  container.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  const dataSegment = Array.from(breadcrumb.querySelectorAll(".json-breadcrumb-segment")).find(
    (segment) => segment.textContent === "data",
  );
  assert.ok(dataSegment, "data segment should exist in breadcrumb");
  assert.equal(dataSegment.disabled, true, "breadcrumb segments should be disabled when navigation is off");

  const scrollBeforeClick = container.scrollTop;
  dataSegment.click();
  await waitForVirtualization(window);

  assert.equal(container.scrollTop, scrollBeforeClick, "breadcrumb click should not change scroll position");

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});



