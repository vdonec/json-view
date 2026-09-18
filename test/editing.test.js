import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { renderJSON, destroy } from "../dist/jsonview.js";

function setupDom(html = "<!doctype html><html><body><div id=\"root\"></div></body></html>", options) {
  const dom = new JSDOM(html, options);
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;

  return { dom, window, root: window.document.querySelector("#root") };
}

function teardownDom() {
  delete globalThis.window;
  delete globalThis.document;
}

test("editable=false: value has no editable marker and double-click does not create an input", () => {
  const { root } = setupDom();
  const tree = renderJSON({ name: "Ada" }, root, { defaultExpanded: true });

  const valueEl = root.querySelector(".json-value");
  assert.ok(valueEl);
  assert.equal(valueEl.classList.contains("json-editable"), false);

  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  assert.equal(root.querySelector(".json-value-input"), null);

  destroy(tree);
  teardownDom();
});

test("editable=true: double-click, edit and Enter commits the new string value", () => {
  const { root } = setupDom();
  const data = { name: "Ada" };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  assert.ok(valueEl.classList.contains("json-editable"));

  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  assert.ok(input, "editing should create an input element");
  assert.equal(input.value, "Ada");

  input.value = "Grace";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  assert.equal(root.querySelector(".json-value-input"), null, "input should be removed after commit");
  assert.equal(root.querySelector(".json-value").textContent, "Grace");
  assert.equal(data.name, "Grace", "underlying data object should be mutated");
  assert.equal(tree.children[0].value, "Grace");

  destroy(tree);
  teardownDom();
});

test("Escape cancels editing without mutating data or DOM", () => {
  const { root } = setupDom();
  const data = { count: 5 };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = "999";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  assert.equal(root.querySelector(".json-value-input"), null);
  assert.equal(root.querySelector(".json-value").textContent, "5");
  assert.equal(data.count, 5);

  destroy(tree);
  teardownDom();
});

test("invalid number input reverts to the previous value on commit", () => {
  const { root } = setupDom();
  const data = { count: 5 };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = "not-a-number";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  assert.equal(root.querySelector(".json-value").textContent, "5");
  assert.equal(data.count, 5);

  destroy(tree);
  teardownDom();
});

test("boolean values only accept 'true'/'false' text on commit", () => {
  const { root } = setupDom();
  const data = { active: false };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = "true";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  assert.equal(data.active, true);
  assert.equal(root.querySelector(".json-value").textContent, "true");

  destroy(tree);
  teardownDom();
});

test("empty object/array values are not editable (regression: hasChildren=false must not imply leaf)", () => {
  const { root } = setupDom();
  const data = { empty_object: {}, empty_array: [] };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEls = Array.from(root.querySelectorAll(".json-value"));
  assert.equal(valueEls.length, 2);

  valueEls.forEach((valueEl) => {
    assert.equal(valueEl.classList.contains("json-editable"), false);
    valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  });

  assert.equal(root.querySelector(".json-value-input"), null, "no input should be created");
  assert.deepEqual(data.empty_object, {}, "empty object must stay an object, not become a string");
  assert.deepEqual(data.empty_array, [], "empty array must stay an array, not become a string");

  destroy(tree);
  teardownDom();
});

test("null values are not editable", () => {
  const { root } = setupDom();
  const tree = renderJSON({ nothing: null }, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  assert.equal(valueEl.classList.contains("json-editable"), false);

  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  assert.equal(root.querySelector(".json-value-input"), null);

  destroy(tree);
  teardownDom();
});

test("blur commits the edit like Enter", () => {
  const { root } = setupDom();
  const data = { name: "Ada" };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = "Grace";
  input.dispatchEvent(new window.Event("blur", { bubbles: true }));

  assert.equal(data.name, "Grace");
  assert.equal(root.querySelector(".json-value").textContent, "Grace");

  destroy(tree);
  teardownDom();
});

test("onEdit callback receives the node, new value and old value", () => {
  const { root } = setupDom();
  const data = { name: "Ada" };
  const edits = [];
  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    editable: true,
    onEdit: (node, newValue, oldValue) => edits.push({ key: node.key, newValue, oldValue }),
  });

  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = "Grace";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  assert.deepEqual(edits, [{ key: "name", newValue: "Grace", oldValue: "Ada" }]);

  destroy(tree);
  teardownDom();
});

test("editing survives virtualized scroll away and back", async () => {
  const { window, root } = setupDom(
    "<!doctype html><html><body><div id=\"root\" style=\"height:200px;overflow:auto;\"></div></body></html>",
    { pretendToBeVisual: true },
  );

  Object.defineProperty(root, "clientHeight", { value: 200, configurable: true });

  const data = {};
  for (let index = 0; index < 80; index += 1) {
    data[`key_${index}`] = `value_${index}`;
  }

  const tree = renderJSON(data, root, {
    defaultExpanded: true,
    editable: true,
    virtualize: true,
    viewportElement: root,
    showScrollPath: false,
  });

  const targetNode = tree.children.find((child) => child.key === "key_0");
  assert.ok(targetNode);

  const editValueOnNode = () => {
    const valueEl = targetNode.el.querySelector(".json-value");
    valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
    const input = targetNode.el.querySelector(".json-value-input");
    input.value = "edited_value";
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  };

  editValueOnNode();
  assert.equal(data.key_0, "edited_value");
  assert.equal(targetNode.el.querySelector(".json-value").textContent, "edited_value");

  // Scroll far down (row 0 leaves the virtualized viewport) and back to top.
  root.scrollTop = 2000;
  root.dispatchEvent(new window.Event("scroll"));
  await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

  root.scrollTop = 0;
  root.dispatchEvent(new window.Event("scroll"));
  await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

  assert.equal(data.key_0, "edited_value", "edit persists in the underlying data");
  assert.equal(
    targetNode.el.querySelector(".json-value").textContent,
    "edited_value",
    "edit persists in the reused cached element after scrolling away and back",
  );

  destroy(tree);
  teardownDom();
});

test("editing rejects HTML payloads as plain text (no injection)", () => {
  const { root } = setupDom();
  const data = { note: "hello" };
  const tree = renderJSON(data, root, { defaultExpanded: true, editable: true });

  const payload = '<img src=x onerror="globalThis.__xss_edit = true">';
  const valueEl = root.querySelector(".json-value");
  valueEl.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const input = root.querySelector(".json-value-input");
  input.value = payload;
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

  assert.equal(data.note, payload);
  assert.equal(root.querySelector(".json-value").textContent, payload);
  assert.equal(root.querySelector("img"), null);
  assert.equal(globalThis.__xss_edit, undefined);

  delete globalThis.__xss_edit;
  destroy(tree);
  teardownDom();
});
