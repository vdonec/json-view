# json-view

A small JavaScript library to display JSON data as an expandable tree in the DOM.

**✨ Zero runtime dependencies** — Fully self-contained library

## Live Demo

Try the interactive demo: **https://vdonec.github.io/json-view/**

The demo lets you:
- Load example JSON or generate large test data
- Toggle rendering options (`defaultExpanded`, `showValueType`, `virtualize`, `overscanRows`)
- Expand/collapse nodes and inspect statistics
- Test virtualization performance with thousands of nodes

## Quick start (local demo)

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/`.

The demo page is `index.html`, demo logic is in `src/main.js`.

## Build package

```bash
npm run build
```

Build output is written to `dist/`:
- `dist/jsonview.js` — ES module
- `dist/jsonview.umd.cjs` — UMD (CommonJS)
- `dist/jsonview.css` — styles
- `dist/jsonview.d.ts` — TypeScript declarations

## Install from npm

```bash
npm install @vdonec/json-view
```

## Usage

```javascript
import "@vdonec/json-view/style.css";
import jsonview from "@vdonec/json-view";

const data = {
  name: "json-view",
  version: "1.x",
  features: ["render", "expand", "collapse", "virtualize"],
};

const root = document.querySelector("#root");

// Basic render
let tree = jsonview.renderJSON(data, root);

// Re-render into the same target: destroy previous tree first
jsonview.destroy(tree);
tree = jsonview.renderJSON(data, root, { defaultExpanded: true });

jsonview.destroy(tree);
tree = jsonview.renderJSON(data, root, { defaultExpanded: 1 });

jsonview.destroy(tree);
tree = jsonview.renderJSON(data, root, { showValueType: true });

jsonview.destroy(tree);
tree = jsonview.renderJSON(data, root, {
  defaultExpanded: true,
  virtualize: true,
  overscanRows: 8,
  viewportElement: root, // external scroll container (e.g. #root with overflow:auto)
});

// Expand / collapse programmatically
jsonview.expand(tree);
jsonview.collapse(tree);

// Toggle a single node
jsonview.toggleNode(tree);

// Traverse all loaded nodes
jsonview.traverse(tree, (node) => console.log(node.key, node.value));

// Clean up listeners and remove from DOM
jsonview.destroy(tree);
```

## Options

### `defaultExpanded` — `boolean | number`

Controls how deep nodes are expanded on initial render.

| Value | Behaviour |
|---|---|
| `false` / omitted | all nodes collapsed |
| `true` | all nodes expanded |
| `0` | only root node expanded |
| `1` | root + first-level children expanded |
| `N` | nodes with depth `<= N` expanded (root depth is `0`) |

Non-integer or negative values are treated as collapsed-by-default.

### `showValueType` — `boolean` (default: `false`)

When `true`, adds a type label (e.g. `string`, `number`, `object`, `array`) before each rendered node value.

### Virtualization options

Virtualization keeps only the rows currently visible in the scroll container in the DOM. This is essential for large JSON payloads with thousands of nodes.

| Option | Type | Default | Description |
|---|---|---|---|
| `virtualize` | `boolean` | `false` | Enable virtualized rendering |
| `overscanRows` | `number` | `8` | Extra rows rendered above and below the visible area for smoother scrolling |
| `viewportElement` | `HTMLElement` | `.json-container` | The scroll container used to calculate visible rows |

**How to set up the scroll container:**

By default the library listens for scroll on its own `.json-container`. If your layout scrolls on a parent element (e.g. `#root` with `overflow: auto` and `max-height`), pass that element via `viewportElement`:

```html
<div id="root" style="max-height: 80vh; overflow: auto;"></div>
```

```javascript
const root = document.querySelector("#root");
jsonview.renderJSON(data, root, {
  virtualize: true,
  viewportElement: root,
});
```

The library automatically handles viewport resize (via `ResizeObserver`) so the visible window is recalculated after programmatic expand/collapse without requiring a manual scroll.

## API

### `create(jsonData, options)`

Parses `jsonData` (JSON string or any JSON-compatible value) and returns a tree object. Does not touch the DOM.

| Option | Type | Description |
|---|---|---|
| `defaultExpanded` | `boolean \| number` | See [Options](#options) |
| `showValueType` | `boolean` | See [Options](#options) |

### `render(tree, targetElement, options)`

Mounts an existing tree object into `targetElement`.

`targetElement` can contain only one mounted json-view tree at a time.
Call `destroy(tree)` before rendering another tree into the same target.

| Option | Type | Description |
|---|---|---|
| `virtualize` | `boolean` | Enable virtualized rendering |
| `overscanRows` | `number` | Extra rows above/below viewport |
| `viewportElement` | `HTMLElement` | External scroll container |

### `renderJSON(jsonData, targetElement, options)`

Shortcut for `create` + `render` in one call. Accepts all options from both.

`targetElement` can contain only one mounted json-view tree at a time. For re-render into the same target, call `destroy(tree)` first.

### `expand(node)`

Recursively expands `node` and all its descendants.

### `collapse(node)`

Recursively collapses `node` and all its descendants.

### `toggleNode(node)`

Toggles a single node between expanded and collapsed.

### `traverse(node, callback)`

Depth-first traversal of all currently-loaded nodes in the subtree.
`callback` receives each `node` object.

### `destroy(tree)`

Removes all event listeners (`scroll`, `resize`, `ResizeObserver`) and detaches the rendered container from the DOM.

## Security

This library prioritizes security:

- **Zero runtime dependencies** — No external dependencies to audit
- **Minimal footprint** — Only what's needed for JSON rendering
- **Safe text rendering** — Escapes untrusted JSON-derived text before injecting UI markup
- **Regression coverage** — `test/xss-regression.test.js` ensures untrusted keys/values render as text, never as executable HTML
- **No code execution** — Simply renders data, never evaluates it

For security policies and reporting vulnerabilities, see [SECURITY.md](./SECURITY.md).

## Project structure

```text
json-view/
  index.html               # local demo page
  public/
    example2.json          # demo JSON payload
  src/
    json-view.js           # library core
    main.js                # demo bootstrap
    style.css              # library styles
    utils/                 # helper modules
  test/
    xss-regression.test.js # security regression tests
    virtualization.test.js # virtualization tests
  dist/                    # build output (generated)
```

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # build library to dist/
npm run preview  # preview built output
npm run test     # build + run automated tests
```
