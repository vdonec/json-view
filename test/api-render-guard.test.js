import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { JSDOM } from "jsdom";

import { renderJSON, destroy } from "../dist/jsonview.js";

test("build produces dist/jsonview.d.ts used by package exports", () => {
  assert.equal(existsSync(new URL("../dist/jsonview.d.ts", import.meta.url)), true);
});

test("renderJSON throws when target already has mounted tree and no destroy was called", () => {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;

  const root = window.document.querySelector("#root");
  const firstTree = renderJSON({ first: true }, root);

  assert.throws(
    () => renderJSON({ second: true }, root),
    /Call destroy\(tree\) before rendering again/,
  );

  destroy(firstTree);
  const secondTree = renderJSON({ second: true }, root);
  assert.ok(secondTree, "render after destroy should succeed");

  destroy(secondTree);
  delete globalThis.window;
  delete globalThis.document;
});


