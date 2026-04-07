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

  let totalVisible = 0;
  traverse(tree, () => {
    totalVisible += 1;
  });

  const initiallyRendered = container.querySelectorAll(".line").length;
  assert.ok(initiallyRendered < totalVisible, "virtualized render should keep only subset of rows");

  container.scrollTop = 900;
  container.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

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

  root.scrollTop = 1000;
  root.dispatchEvent(new window.Event("scroll"));
  await waitForVirtualization(window);

  const topSpacer = container.querySelector(".json-virtual-spacer");
  assert.ok(topSpacer, "top spacer should exist");
  assert.notEqual(topSpacer.style.height, "0px", "top spacer should reflect parent scroll");

  destroy(tree);
  delete globalThis.window;
  delete globalThis.document;
});



