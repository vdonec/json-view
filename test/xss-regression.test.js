import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { renderJSON } from "../dist/jsonview.js";

test("renderJSON does not inject HTML from untrusted keys and values", () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const keyPayload = '<img src=x onerror="globalThis.__xss_key = true">';
  const valuePayload = '<svg onload="globalThis.__xss_value = true"></svg>';
  const data = {
    [keyPayload]: valuePayload,
  };

  renderJSON(data, root, { defaultExpanded: true, showValueType: true });

  const keyNode = Array.from(root.querySelectorAll(".json-key")).find(
    (node) => node.textContent === keyPayload,
  );
  const valueNode = Array.from(root.querySelectorAll(".json-value")).find(
    (node) => node.textContent === valuePayload,
  );

  assert.ok(keyNode, "key node should exist");
  assert.ok(valueNode, "value node should exist");
  assert.equal(keyNode.textContent, keyPayload);
  assert.equal(valueNode.textContent, valuePayload);

  // Payload must stay text and never become executable DOM nodes.
  assert.equal(root.querySelector("img"), null);
  assert.equal(root.querySelector("svg"), null);
  assert.equal(globalThis.__xss_key, undefined);
  assert.equal(globalThis.__xss_value, undefined);

  delete globalThis.window;
  delete globalThis.document;
});


