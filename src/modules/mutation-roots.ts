interface HighlightNode {
  parentNode?: HighlightNode | null;
  isConnected?: boolean;
  contains?: (other: HighlightNode) => boolean;
  nodeType?: number;
  parentElement?: HighlightElement | null;
}

interface HighlightElement extends HighlightNode {
  closest?: (selector: string) => HighlightElement | null;
  matches?: (selector: string) => boolean;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const HIGHLIGHTY_OWNED_SELECTOR = '[data-highlighty-ignore], mark.Highlighty__phrase';

export function isHighlightableAddedNode(node: HighlightNode): boolean {
  if (
    node.isConnected === false ||
    (node.nodeType !== ELEMENT_NODE && node.nodeType !== TEXT_NODE)
  ) {
    return false;
  }

  const element = node.nodeType === ELEMENT_NODE ? (node as HighlightElement) : node.parentElement;
  return !element?.closest?.(HIGHLIGHTY_OWNED_SELECTOR);
}

export function selectHighlightRoots<T extends HighlightNode>(nodes: Iterable<T>): T[] {
  const roots: T[] = [];

  for (const node of nodes) {
    if (!isHighlightableAddedNode(node)) continue;
    if (roots.some((root) => root === node || root.contains?.(node))) continue;

    for (let index = roots.length - 1; index >= 0; index--) {
      if (node.contains?.(roots[index])) roots.splice(index, 1);
    }
    roots.push(node);
  }

  return roots;
}
