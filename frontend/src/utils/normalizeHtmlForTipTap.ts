// Normalize HTML structure for TipTap parsing - wraps orphaned inline elements in <p> tags
export function normalizeHtmlForTipTap(html: string): string {
  // Parse in an inert document (stored HTML is user-written; a detached
  // div's innerHTML would still run <img onerror> handlers)
  // and build the wrapper <p>s in that same document: moving a parsed <img> into a
  // live-document element adopts it, which starts the load and fires onerror.
  const inertDoc = new DOMParser().parseFromString(html, 'text/html');
  const container = inertDoc.body;

  // Inline tags that need block wrapping when at root level
  const inlineTags = ['B', 'I', 'STRONG', 'EM', 'U', 'S', 'SPAN', 'A', 'CODE', 'MARK'];

  // Use globalThis.Node to avoid conflict with TipTap's Node import
  const DOMNode = globalThis.Node;
  const result: globalThis.Node[] = [];
  let currentParagraph: HTMLParagraphElement | null = null;

  const flushParagraph = () => {
    if (currentParagraph && currentParagraph.innerHTML.trim()) {
      result.push(currentParagraph);
    }
    currentParagraph = null;
  };

  container.childNodes.forEach(node => {
    if (node.nodeType === DOMNode.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        if (!currentParagraph) {
          currentParagraph = inertDoc.createElement('p');
        }
        currentParagraph.appendChild(inertDoc.createTextNode(node.textContent || ''));
      }
    } else if (node.nodeType === DOMNode.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      if (tagName === 'BR') {
        // BR at root level - flush current paragraph, start new one
        flushParagraph();
      } else if (inlineTags.includes(tagName)) {
        // Inline element at root - add to current paragraph
        if (!currentParagraph) {
          currentParagraph = inertDoc.createElement('p');
        }
        currentParagraph.appendChild(el.cloneNode(true));
      } else {
        // Block element - flush paragraph first, then add block
        flushParagraph();
        result.push(el.cloneNode(true));
      }
    }
  });

  flushParagraph();

  // Convert result back to HTML string
  const output = inertDoc.createElement('div');
  result.forEach(node => output.appendChild(node));
  return output.innerHTML;
}
