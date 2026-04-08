export interface JsonViewNode {
  key: string | null;
  parent: JsonViewNode | null;
  value: unknown;
  isExpanded: boolean;
  defaultExpanded: boolean;
  type: string;
  showValueType: boolean;
  hasChildren: boolean;
  childCount: number;
  children: JsonViewNode[];
  childrenLoaded: boolean;
  expandDepthLimit: number;
  el: HTMLElement | null;
  depth: number;
  dispose: (() => void) | null;
  renderState: unknown;
}

export type JsonInput = string | number | boolean | null | object;

export interface CreateOptions {
  defaultExpanded?: boolean | number;
  showValueType?: boolean;
}

export interface RenderOptions {
  virtualize?: boolean;
  overscanRows?: number;
  viewportElement?: HTMLElement;
}

export type RenderJSONOptions = CreateOptions & RenderOptions;

export function toggleNode(node: JsonViewNode): void;
export function traverse(node: JsonViewNode, callback: (node: JsonViewNode) => void): void;
export function create(jsonData: JsonInput, options?: CreateOptions): JsonViewNode;
export function renderJSON(
  jsonData: JsonInput,
  targetElement: HTMLElement,
  options?: RenderJSONOptions,
): JsonViewNode;
export function render(tree: JsonViewNode, targetElement: HTMLElement, options?: RenderOptions): void;
export function expand(node: JsonViewNode): void;
export function collapse(node: JsonViewNode): void;
export function destroy(tree: JsonViewNode): void;

declare const jsonview: {
  toggleNode: typeof toggleNode;
  traverse: typeof traverse;
  create: typeof create;
  renderJSON: typeof renderJSON;
  render: typeof render;
  expand: typeof expand;
  collapse: typeof collapse;
  destroy: typeof destroy;
};

export default jsonview;

