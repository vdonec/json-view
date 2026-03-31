# json-view

A small JavaScript library to display JSON data as an expandable tree in the DOM.

**✨ Zero runtime dependencies** - Fully self-contained library

## Quick start (local demo)

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/`.

The demo page is `index.html`, and demo logic is in `src/main.js`.

## Build package

```bash
npm run build
```

Build output is written to `dist/`:
- `dist/jsonview.js` (ES module)
- `dist/jsonview.umd.cjs` (UMD)
- `dist/jsonview.css`

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
  version: "3.x",
  features: ["render", "expand", "collapse"],
};

const root = document.querySelector("#root");
const tree = jsonview.renderJSON(data, root, { defaultExpanded: false });
const treeAllExpanded = jsonview.renderJSON(data, root, { defaultExpanded: true });
const treeDepthExpanded = jsonview.renderJSON(data, root, { defaultExpanded: 1 });

jsonview.expand(tree);
jsonview.collapse(tree);
```

`defaultExpanded` supports `boolean | number`:
- `false` (or omitted) - all nodes are collapsed by default
- `true` - expand all nodes
- `0` - expand only root node
- `1` - expand root and first level children
- `N` - expand nodes with depth `<= N` (`root` depth is `0`)

Non-integer or negative values are treated as collapsed-by-default behavior.

## API

- `create(jsonData, options)` - create tree object (`options.defaultExpanded: boolean | number`)
- `render(tree, targetElement)` - render existing tree
- `renderJSON(jsonData, targetElement, options)` - create + render in one call (`options.defaultExpanded: boolean | number`)
- `expand(node)` - expand all descendants
- `collapse(node)` - collapse all descendants
- `toggleNode(node)` - toggle one node
- `traverse(node, callback)` - DFS traversal
- `destroy(tree)` - remove listeners and unmount tree

## Security

This library prioritizes security:

- **Zero runtime dependencies** - No external dependencies to audit
- **Minimal footprint** - Only what's needed for JSON rendering
- **DOM-based rendering** - Uses native DOM APIs for inherent XSS protection
- **No code execution** - Simply renders data, never executes code

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
    utils/                 # helpers
  dist/                    # build output (generated)
```

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # build library to dist/
npm run preview  # preview built output
```

